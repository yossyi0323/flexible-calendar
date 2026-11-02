import {
  addDays,
  atMinute,
  buildColumns,
  dateKey,
  differenceInDays,
  shiftDate,
  defaultTimeZone,
  eventsInDay,
  formatDate,
  layoutSegments,
  minuteOfDay,
  moveEvent,
  navigateCalendar,
  getViewDates,
  matchesResource,
  eventResourceIds,
  resizeEvent,
  snapMinute,
  splitEvent,
  MS_PER_MINUTE,
  type BuiltInView,
  type CalendarEvent,
  type Column,
  type DateKey,
  type EventChange,
  type SlotSelection,
  type View,
} from "../core/index.js";
import { validateOptions } from "./options.js";
import {
  applyStyle,
  button,
  element,
  englishMessages,
  setContent,
} from "./helpers.js";
import type { CalendarHandle, CalendarOptions } from "./types.js";

type Hit = {
  column: Column;
  minute: number;
  allDay: boolean;
  node: HTMLElement;
};
type Gesture<E extends CalendarEvent> = {
  id: number;
  capture: HTMLElement;
  origin: Hit;
  current: Hit;
  event?: E;
  edge?: "start" | "end";
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  offset: number;
};
const DEFAULT_VIEWS: readonly View[] = [
  "day",
  "week",
  "work-week",
  "month",
  "agenda",
  "vertical",
];
const DRAG_THRESHOLD = 5;
const AUTO_SCROLL_EDGE = 40;
const AUTO_SCROLL_SPEED = 12;

/** Mount into an empty, caller-owned element. No global DOM or framework dependencies. */
export function createCalendar<E extends CalendarEvent>(
  host: HTMLElement,
  initial: CalendarOptions<E>,
): CalendarHandle<E> {
  let options = { ...initial };
  validateOptions(options);
  const doc = host.ownerDocument,
    win = doc.defaultView!;
  const root = element(doc, "section", "fc-calendar");
  root.setAttribute("aria-label", "Calendar");
  host.append(root);
  let scroller: HTMLElement;
  let live: HTMLElement;
  let gesture: Gesture<E> | undefined;
  let raf = 0,
    destroyed = false,
    suppressClick = false;
  let activeMinute = options.scrollToMinute ?? 9 * 60;
  let lastRange = "";
  let renderedView: View | undefined;
  const scrollPositions = new Map<View, { top: number; left: number }>();
  const expanded = new Set<DateKey>();
  const tz = () => options.timeZone ?? defaultTimeZone();
  const locale = () => options.locale ?? "en-US";
  const view = () => options.view ?? "week";
  const step = () => options.step ?? 30;
  const min = () => options.minMinute ?? 0;
  const max = () => options.maxMinute ?? 1440;
  const messages = () => ({ ...englishMessages, ...options.messages });
  const fmt = (date: Date, format: Intl.DateTimeFormatOptions) =>
    formatDate(date, locale(), tz(), format);
  const dayLabel = (date: DateKey) =>
    options.formats?.day?.(atMinute(date, 720, tz())) ??
    fmt(atMinute(date, 12 * 60, tz()), {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const timeLabel = (date: Date) =>
    options.formats?.time?.(date) ??
    fmt(date, { hour: "numeric", minute: "2-digit" });
  const announce = (message: string) => {
    live.textContent = message;
  };
  const canEdit = (event: E) =>
    options.editable !== false && event.editable !== false;
  const dates = () => getViewDates(options);
  const isToday = (date: DateKey) =>
    date === dateKey(options.now?.() ?? new Date(), tz());

  function emitChange(change: EventChange<E>) {
    if (options.canChangeEvent?.(change) === false) {
      announce("Change rejected");
      return;
    }
    announce(
      `${change.event.title}: ${dayLabel(dateKey(change.start, tz()))} ${timeLabel(change.start)} – ${timeLabel(change.end)}`,
    );
    options.onEventChange?.(change);
  }
  function emitSlot(selection: SlotSelection) {
    if (
      selection.end <= selection.start ||
      options.onSelecting?.(selection) === false
    )
      return;
    announce(
      `${dayLabel(dateKey(selection.start, tz()))} ${timeLabel(selection.start)} – ${timeLabel(selection.end)}`,
    );
    options.onSelectSlot?.(selection);
  }
  function setDate(date: Date) {
    const next = { ...options, date };
    validateOptions(next);
    options = next;
    expanded.clear();
    render();
    options.onNavigate?.(date, view());
  }
  function setView(next: View) {
    const updated = { ...options, view: next };
    validateOptions(updated);
    options = updated;
    expanded.clear();
    render();
    options.onViewChange?.(next);
  }
  function drillDown(day: DateKey) {
    const date = atMinute(day, 0, tz());
    if (options.onDrillDown) options.onDrillDown(date, "day");
    else {
      options = { ...options, date, view: "day" };
      render();
      options.onNavigate?.(date, "day");
      options.onViewChange?.("day");
    }
  }
  function toolbar() {
    const bar = element(doc, "div", "fc-toolbar");
    const navigation = element(doc, "div", "fc-navigation");
    navigation.append(
      button(doc, "‹", () => setDate(navigateCalendar(options, -1))),
    );
    navigation.lastElementChild!.setAttribute(
      "aria-label",
      messages().previous,
    );
    navigation.append(
      button(doc, messages().today, () =>
        setDate(options.now?.() ?? new Date()),
      ),
    );
    navigation.append(
      button(doc, "›", () => setDate(navigateCalendar(options, 1))),
    );
    navigation.lastElementChild!.setAttribute("aria-label", messages().next);
    const range = dates();
    const label =
      options.formats?.period?.(
        atMinute(range[0]!, 0, tz()),
        atMinute(addDays(range.at(-1)!, 1), 0, tz()),
        view(),
      ) ??
      (view() === "month"
        ? fmt(options.date, { month: "long", year: "numeric" })
        : `${dayLabel(range[0]!)}${range.length > 1 ? ` — ${dayLabel(range.at(-1)!)}` : ""}`);
    if (options.renderToolbar) {
      setContent(
        bar,
        options.renderToolbar({
          date: options.date,
          view: view(),
          label,
          views: options.views ?? [
            ...DEFAULT_VIEWS,
            ...Object.keys(options.customViews ?? {}),
          ],
          navigate: (action) =>
            setDate(
              action === "today"
                ? (options.now?.() ?? new Date())
                : navigateCalendar(options, action === "previous" ? -1 : 1),
            ),
          setView,
        }),
      );
      root.append(bar);
      return;
    }
    const title = element(doc, "h2", "fc-period", label);
    const tabs = element(doc, "div", "fc-views");
    tabs.setAttribute("aria-label", "Calendar view");
    for (const value of options.views ?? [
      ...DEFAULT_VIEWS,
      ...Object.keys(options.customViews ?? {}),
    ]) {
      const tab = button(
        doc,
        options.customViews?.[value]?.label ?? messages()[value as BuiltInView],
        () => setView(value),
      );
      tab.setAttribute("aria-pressed", String(value === view()));
      tabs.append(tab);
    }
    bar.append(navigation, title, tabs);
    root.append(bar);
  }
  function eventNode(event: E, date: DateKey, timed = false) {
    const node = button(
      doc,
      "",
      (source) => {
        if (!suppressClick) options.onSelectEvent?.(event, source);
      },
      "fc-event",
    );
    node.dataset.eventId = event.id;
    node.dataset.date = date;
    node.setAttribute(
      "aria-label",
      `${event.title} ${event.allDay ? messages().allDay : `${timeLabel(event.start)}–${timeLabel(event.end)}`}`,
    );
    if (event.id === options.selectedEventId) node.classList.add("fc-selected");
    if (event.color) node.style.setProperty("--fc-event-color", event.color);
    applyStyle(node, options.eventStyle?.(event));
    const body = element(doc, "span", "fc-event-content");
    if (options.renderEvent)
      setContent(body, options.renderEvent(event, { view: view(), date }));
    else {
      body.append(element(doc, "span", "fc-event-title", event.title));
      if (!event.allDay && timed) {
        body.append(doc.createTextNode(" "));
        body.append(
          element(
            doc,
            "span",
            "fc-event-time",
            `${timeLabel(event.start)}–${timeLabel(event.end)}`,
          ),
        );
      }
    }
    node.append(body);
    node.addEventListener("dblclick", (source) =>
      options.onDoubleClickEvent?.(event, source),
    );
    node.addEventListener("keydown", (source) =>
      eventKeyboard(source, event, date),
    );
    if (canEdit(event)) {
      node.classList.add("fc-editable");
      if (options.resizable !== false)
        for (const edge of ["start", "end"] as const) {
          const handle = element(doc, "span", `fc-resize fc-resize-${edge}`);
          handle.dataset.edge = edge;
          handle.setAttribute("aria-hidden", "true");
          node.append(handle);
        }
    }
    return node;
  }
  function eventKeyboard(source: KeyboardEvent, event: E, date: DateKey) {
    if (!source.altKey || !canEdit(event)) return;
    const direction =
      source.key === "ArrowUp" || source.key === "ArrowLeft"
        ? -1
        : source.key === "ArrowDown" || source.key === "ArrowRight"
          ? 1
          : 0;
    if (!direction) return;
    source.preventDefault();
    source.stopPropagation();
    const change = {
      event,
      start: new Date(event.start),
      end: new Date(event.end),
      ...(event.resourceId === undefined
        ? {}
        : { resourceId: event.resourceId }),
      allDay: !!event.allDay,
      action: "move",
    } satisfies EventChange<E>;
    if (source.shiftKey) {
      if (options.resizable === false) return;
      const delta = (event.allDay ? 1440 : step()) * direction;
      emitChange(
        resizeEvent(
          event,
          "end",
          dateKey(event.end, tz()),
          minuteOfDay(event.end, tz()) + delta,
          tz(),
        ),
      );
      return;
    }
    if (source.key === "ArrowLeft" || source.key === "ArrowRight") {
      const horizontal = options.direction === "rtl" ? -direction : direction;
      if (view() === "month" || view() === "agenda") {
        emitChange(
          moveEvent(
            event,
            addDays(dateKey(event.start, tz()), horizontal),
            minuteOfDay(event.start, tz()),
            tz(),
            event.resourceId,
          ),
        );
        return;
      }
      const columns = buildColumns(options);
      const index = columns.findIndex(
        (c) =>
          c.date === date &&
          c.resourceId ===
            ((source.currentTarget as HTMLElement).closest<HTMLElement>(
              "[data-column-key]",
            )?.dataset.resourceId ?? eventResourceIds(event)[0]),
      );
      const target = columns[index + horizontal];
      if (target)
        emitChange(
          moveEvent(
            event,
            addDays(
              dateKey(event.start, tz()),
              differenceInDays(date, target.date),
            ),
            minuteOfDay(event.start, tz()),
            tz(),
            target.resourceId,
          ),
        );
      else
        emitChange(
          moveEvent(
            event,
            addDays(dateKey(event.start, tz()), horizontal),
            minuteOfDay(event.start, tz()),
            tz(),
            event.resourceId,
          ),
        );
    } else {
      if (event.allDay) {
        emitChange({
          ...change,
          start: shiftDate(event.start, direction, tz()),
          end: shiftDate(event.end, direction, tz()),
        });
        return;
      }
      const delta = direction * step() * MS_PER_MINUTE;
      change.start = new Date(+event.start + delta);
      change.end = new Date(+event.end + delta);
      emitChange(change);
    }
  }
  function decorateDay(node: HTMLElement, date: DateKey) {
    if (isToday(date)) node.classList.add("fc-today");
    applyStyle(node, options.dayStyle?.(date));
  }
  function setHitData(node: HTMLElement, column: Column, allDay: boolean) {
    node.dataset.columnKey = column.key;
    node.dataset.date = column.date;
    if (column.resourceId !== undefined)
      node.dataset.resourceId = column.resourceId;
    node.dataset.allDay = String(allDay);
  }
  function timeView() {
    const columns = buildColumns(options);
    const canvas = element(doc, "div", "fc-time-canvas");
    canvas.style.setProperty("--fc-columns", String(columns.length));
    canvas.style.minWidth = `${64 + columns.length * (options.columnWidth ?? 160)}px`;
    const header = element(doc, "div", "fc-time-header");
    header.append(
      element(doc, "div", "fc-gutter fc-zone", tz().replaceAll("_", " ")),
    );
    for (const column of columns) {
      const cell = element(doc, "div", "fc-column-header");
      cell.dataset.date = column.date;
      decorateDay(cell, column.date);
      if (options.renderColumnHeader)
        setContent(cell, options.renderColumnHeader(column));
      else {
        cell.append(
          button(
            doc,
            dayLabel(column.date),
            () => drillDown(column.date),
            "fc-date-link",
          ),
        );
        if (column.title)
          cell.append(element(doc, "span", "fc-resource-title", column.title));
      }
      header.append(cell);
    }
    const allDay = element(doc, "div", "fc-all-day-row");
    allDay.append(element(doc, "div", "fc-gutter", messages().allDay));
    for (const column of columns) {
      const cell = element(doc, "div", "fc-all-day-cell");
      setHitData(cell, column, true);
      decorateDay(cell, column.date);
      if (options.selectable !== false) {
        cell.tabIndex = 0;
        cell.setAttribute("role", "group");
        cell.setAttribute(
          "aria-label",
          `${dayLabel(column.date)} ${column.title} ${messages().allDay}`,
        );
        cell.addEventListener("keydown", (e) => dayKeyboard(e, column));
      }
      for (const event of eventsInDay(options.events, column.date, tz()).filter(
        (e) => e.allDay && matchesResource(e, column.resourceId),
      ))
        cell.append(eventNode(event, column.date));
      allDay.append(cell);
    }
    const body = element(doc, "div", "fc-time-body");
    const height = ((max() - min()) / 60) * (options.hourHeight ?? 64);
    body.style.height = `${height}px`;
    body.style.setProperty(
      "--fc-step-height",
      `${(step() / 60) * (options.hourHeight ?? 64)}px`,
    );
    const gutter = element(doc, "div", "fc-time-gutter");
    for (let minute = min(); minute < max(); minute += 60) {
      const label = element(
        doc,
        "span",
        "fc-time-label",
        timeLabel(atMinute(columns[0]!.date, minute, tz())),
      );
      label.style.top = `${((minute - min()) / (max() - min())) * 100}%`;
      gutter.append(label);
    }
    body.append(gutter);
    for (const column of columns) {
      const cell = element(doc, "div", "fc-time-column");
      setHitData(cell, column, false);
      decorateDay(cell, column.date);
      applyStyle(cell, options.columnStyle?.(column));
      if (options.selectable !== false) {
        cell.tabIndex = 0;
        cell.setAttribute("role", "group");
        cell.setAttribute(
          "aria-label",
          `${dayLabel(column.date)} ${column.title}; arrow keys choose time, Enter selects`,
        );
        cell.addEventListener("keydown", (e) => slotKeyboard(e, column, cell));
        cell.addEventListener("focus", () => showKeyboardCursor(cell, column));
        cell.addEventListener("blur", () =>
          cell.querySelector(".fc-keyboard-cursor")?.remove(),
        );
      }
      const matched = options.events.filter(
        (e) => !e.allDay && matchesResource(e, column.resourceId),
      );
      const segments = matched
        .flatMap((e) => splitEvent(e, [column.date], tz()))
        .map((s) => ({
          ...s,
          startMinute: Math.max(min(), s.startMinute),
          endMinute: Math.min(
            max(),
            s.endMinute <= s.startMinute ? s.startMinute + step() : s.endMinute,
          ),
        }))
        .filter((s) => s.startMinute < s.endMinute);
      for (const bg of (options.backgroundEvents ?? []).filter((e) =>
        matchesResource(e, column.resourceId),
      ))
        for (const s of splitEvent(bg, [column.date], tz())) {
          const node = element(doc, "div", "fc-background-event");
          node.setAttribute("aria-hidden", "true");
          if (bg.color) node.style.backgroundColor = bg.color;
          position(
            node,
            Math.max(min(), s.startMinute),
            Math.min(max(), s.endMinute),
          );
          cell.append(node);
        }
      const positioned =
        typeof options.dayLayoutAlgorithm === "function"
          ? options.dayLayoutAlgorithm(segments)
          : layoutSegments(segments);
      for (const segment of positioned) {
        const width =
          options.dayLayoutAlgorithm === "overlap"
            ? Math.min(1 - segment.left, segment.width * 1.7)
            : segment.width;
        const node = eventNode(segment.event, column.date, true);
        node.classList.add("fc-timed-event");
        position(node, segment.startMinute, segment.endMinute);
        node.style.insetInlineStart = `${segment.left * 100}%`;
        node.style.width = `calc(${width * 100}% - 3px)`;
        if (segment.continuesBefore) {
          node.classList.add("fc-continues-before");
          node.querySelector('[data-edge="start"]')?.remove();
        }
        if (segment.continuesAfter) {
          node.classList.add("fc-continues-after");
          node.querySelector('[data-edge="end"]')?.remove();
        }
        cell.append(node);
      }
      body.append(cell);
    }
    const sticky = element(doc, "div", "fc-sticky-head");
    sticky.append(header, allDay);
    canvas.append(sticky, body);
    scroller.append(canvas);
    updateNow();
  }
  function position(node: HTMLElement, start: number, end: number) {
    node.style.top = `${((start - min()) / (max() - min())) * 100}%`;
    node.style.height = `${((end - start) / (max() - min())) * 100}%`;
  }
  function showKeyboardCursor(cell: HTMLElement, column: Column) {
    cell.querySelector(".fc-keyboard-cursor")?.remove();
    activeMinute = Math.max(min(), Math.min(max() - step(), activeMinute));
    const cursor = element(
      doc,
      "div",
      "fc-keyboard-cursor",
      timeLabel(atMinute(column.date, activeMinute, tz())),
    );
    position(cursor, activeMinute, Math.min(max(), activeMinute + step()));
    cell.append(cursor);
  }
  function slotKeyboard(e: KeyboardEvent, column: Column, cell: HTMLElement) {
    if (e.target !== cell) return;
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      e.preventDefault();
      activeMinute =
        e.key === "Home"
          ? min()
          : e.key === "End"
            ? max() - step()
            : activeMinute + (e.key === "ArrowUp" ? -step() : step());
      showKeyboardCursor(cell, column);
      cell
        .querySelector(".fc-keyboard-cursor")
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      announce(timeLabel(atMinute(column.date, activeMinute, tz())));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const cells = [...root.querySelectorAll<HTMLElement>(".fc-time-column")];
      const direction =
        (e.key === "ArrowLeft" ? -1 : 1) *
        (options.direction === "rtl" ? -1 : 1);
      cells[cells.indexOf(cell) + direction]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      emitSlot({
        start: atMinute(column.date, activeMinute, tz()),
        end: atMinute(
          column.date,
          Math.min(max(), activeMinute + step()),
          tz(),
        ),
        ...(column.resourceId === undefined
          ? {}
          : { resourceId: column.resourceId }),
        allDay: false,
        action: "keyboard",
      });
    }
  }
  function dayKeyboard(e: KeyboardEvent, column: Column) {
    if (e.target !== e.currentTarget || !["Enter", " "].includes(e.key)) return;
    e.preventDefault();
    emitSlot({
      start: atMinute(column.date, 0, tz()),
      end: atMinute(addDays(column.date, 1), 0, tz()),
      ...(column.resourceId === undefined
        ? {}
        : { resourceId: column.resourceId }),
      allDay: true,
      action: "keyboard",
    });
  }
  function monthView() {
    const grid = element(doc, "div", "fc-month");
    const range = dates();
    for (const day of range.slice(0, 7))
      grid.append(
        element(
          doc,
          "div",
          "fc-weekday",
          fmt(atMinute(day, 720, tz()), { weekday: "short" }),
        ),
      );
    for (const day of range) {
      const cell = element(doc, "div", "fc-month-day");
      const column = { key: day, date: day, title: "" };
      setHitData(cell, column, true);
      decorateDay(cell, day);
      if (day.slice(0, 7) !== dateKey(options.date, tz()).slice(0, 7))
        cell.classList.add("fc-outside-month");
      if (options.selectable !== false) {
        cell.tabIndex = 0;
        cell.setAttribute("role", "group");
        cell.setAttribute("aria-label", dayLabel(day));
        cell.addEventListener("keydown", (e) => dayKeyboard(e, column));
      }
      cell.append(
        button(
          doc,
          fmt(atMinute(day, 720, tz()), { day: "numeric" }),
          () => drillDown(day),
          "fc-date-link",
        ),
      );
      const events = eventsInDay(options.events, day, tz());
      const limit = expanded.has(day)
        ? events.length
        : (options.monthMaxEvents ?? 3);
      for (const event of events.slice(0, limit))
        cell.append(eventNode(event, day));
      if (events.length > limit)
        cell.append(
          button(
            doc,
            messages().more(events.length - limit),
            () => {
              if (options.onShowMore) options.onShowMore(events, day);
              else {
                expanded.add(day);
                render();
              }
            },
            "fc-show-more",
          ),
        );
      grid.append(cell);
    }
    scroller.append(grid);
  }
  function agendaView() {
    const table = element(doc, "table", "fc-agenda");
    const caption = element(doc, "caption", "fc-sr-only", messages().agenda);
    table.append(caption);
    const body = doc.createElement("tbody");
    let count = 0;
    for (const day of dates()) {
      const events = eventsInDay(options.events, day, tz());
      for (const [index, event] of events.entries()) {
        count++;
        const row = doc.createElement("tr");
        const dateCell = doc.createElement("th");
        dateCell.scope = "row";
        dateCell.textContent = index === 0 ? dayLabel(day) : "";
        const time = element(
          doc,
          "td",
          "fc-agenda-time",
          event.allDay
            ? messages().allDay
            : `${timeLabel(event.start)} – ${timeLabel(event.end)}`,
        );
        const title = doc.createElement("td");
        title.append(eventNode(event, day));
        const resource = element(
          doc,
          "td",
          "fc-agenda-resource",
          eventResourceIds(event)
            .map(
              (id) =>
                (options.resourcesForDate?.(day) ?? options.resources)?.find(
                  (r) => r.id === id,
                )?.title ?? id,
            )
            .join(", "),
        );
        row.append(dateCell, time, title, resource);
        body.append(row);
      }
    }
    table.append(body);
    scroller.append(
      count ? table : element(doc, "p", "fc-empty", messages().noEvents),
    );
  }
  function updateNow() {
    root.querySelectorAll(".fc-now").forEach((n) => n.remove());
    const now = options.now?.() ?? new Date(),
      minute = minuteOfDay(now, tz());
    for (const cell of root.querySelectorAll<HTMLElement>(
      ".fc-column-header, .fc-time-column, .fc-all-day-cell, .fc-month-day",
    ))
      cell.classList.toggle(
        "fc-today",
        cell.dataset.date === dateKey(now, tz()),
      );
    if (minute < min() || minute > max()) return;
    for (const cell of root.querySelectorAll<HTMLElement>(".fc-time-column"))
      if (cell.dataset.date === dateKey(now, tz())) {
        const line = element(doc, "div", "fc-now");
        line.style.top = `${((minute - min()) / (max() - min())) * 100}%`;
        line.setAttribute("aria-hidden", "true");
        cell.append(line);
      }
  }
  function render() {
    if (destroyed) return;
    stopGesture();
    options.onBeforeRender?.();
    if (renderedView && scroller)
      scrollPositions.set(renderedView, {
        top: scroller.scrollTop,
        left: scroller.scrollLeft,
      });
    const { top, left } = scrollPositions.get(view()) ?? {
      top: ["month", "agenda"].includes(view())
        ? 0
        : Math.max(
            0,
            (((options.scrollToMinute ?? min()) - min()) / 60) *
              (options.hourHeight ?? 64),
          ),
      left: 0,
    };
    renderedView = view();
    const focused = root.contains(doc.activeElement)
      ? (doc.activeElement as HTMLElement)
      : null;
    const focusEvent = focused?.dataset.eventId,
      focusColumn = focused?.dataset.columnKey;
    root.replaceChildren();
    root.dataset.theme = options.theme ?? "auto";
    root.dataset.touchSelection = String(options.touchSelection ?? false);
    root.dir = options.direction ?? "ltr";
    root.style.height =
      typeof options.height === "number"
        ? `${options.height}px`
        : (options.height ?? "680px");
    if (options.toolbar !== false) toolbar();
    scroller = element(doc, "div", "fc-scroller");
    root.append(scroller);
    live = element(doc, "div", "fc-sr-only");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    root.append(live);
    const customRenderer = options.customViewRenderers?.[view()];
    if (options.customViews?.[view()] && customRenderer)
      setContent(
        scroller,
        customRenderer({
          document: doc,
          dates: dates(),
          events: options.events,
          renderEvent: eventNode,
          selectSlot: emitSlot,
          changeEvent: emitChange,
        }),
      );
    else if (view() === "month") monthView();
    else if (view() === "agenda") agendaView();
    else timeView();
    scroller.scrollTop = top;
    scroller.scrollLeft = left;
    if (focusEvent)
      [...root.querySelectorAll<HTMLElement>("[data-event-id]")]
        .find((n) => n.dataset.eventId === focusEvent)
        ?.focus({ preventScroll: true });
    else if (focusColumn)
      [...root.querySelectorAll<HTMLElement>("[data-column-key]")]
        .find(
          (n) =>
            n.dataset.columnKey === focusColumn &&
            n.classList.contains("fc-time-column"),
        )
        ?.focus({ preventScroll: true });
    options.onRender?.();
    const range = dates();
    const signature = `${view()}/${tz()}/${range[0]}/${range.at(-1)}`;
    if (signature !== lastRange) {
      lastRange = signature;
      options.onRangeChange?.(
        {
          start: atMinute(range[0]!, 0, tz()),
          end: atMinute(addDays(range.at(-1)!, 1), 0, tz()),
        },
        view(),
      );
    }
  }
  function hitAt(x: number, y: number): Hit | undefined {
    const target = doc
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-column-key]");
    if (!target || !root.contains(target)) return;
    const rect = target.getBoundingClientRect(),
      allDay = target.dataset.allDay === "true";
    const column: Column = {
      key: target.dataset.columnKey!,
      date: target.dataset.date!,
      title: "",
      ...(target.dataset.resourceId === undefined
        ? {}
        : { resourceId: target.dataset.resourceId }),
    };
    return {
      column,
      allDay,
      minute: allDay
        ? 0
        : snapMinute(
            min() + ((y - rect.top) / rect.height) * (max() - min()),
            step(),
            min(),
            max(),
          ),
      node: target,
    };
  }
  function pointerDown(e: PointerEvent) {
    if (e.button !== 0 || !e.isPrimary || gesture) return;
    const target = e.target as HTMLElement;
    if (target.closest(".fc-date-link, .fc-show-more, .fc-toolbar")) return;
    const hit = hitAt(e.clientX, e.clientY);
    if (!hit) return;
    const eventId =
      target.closest<HTMLElement>("[data-event-id]")?.dataset.eventId;
    const event = options.events.find((item) => item.id === eventId);
    if (event ? !canEdit(event) : options.selectable === false) return;
    const edge = target.closest<HTMLElement>("[data-edge]")?.dataset.edge as
      "start" | "end" | undefined;
    const capture = target.closest<HTMLElement>("[data-event-id]") ?? hit.node;
    gesture = {
      id: e.pointerId,
      capture,
      origin: hit,
      current: hit,
      ...(event ? { event } : {}),
      ...(edge ? { edge } : {}),
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      offset: event
        ? +atMinute(hit.column.date, hit.minute, tz()) - +event.start
        : 0,
    };
    capture.setPointerCapture(e.pointerId);
    root.classList.add("fc-interacting");
    raf = win.requestAnimationFrame(autoScroll);
  }
  function pointerMove(e: PointerEvent) {
    if (!gesture || gesture.id !== e.pointerId) return;
    gesture.lastX = e.clientX;
    gesture.lastY = e.clientY;
    gesture.moved ||=
      Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) >=
      DRAG_THRESHOLD;
    const hit = hitAt(e.clientX, e.clientY);
    if (hit) gesture.current = hit;
    if (gesture.moved) {
      e.preventDefault();
      drawPreview();
    }
  }
  function selectionFrom(g: Gesture<E>): SlotSelection {
    const a = g.origin,
      b = g.current;
    let start = atMinute(a.column.date, a.minute, tz()),
      end = atMinute(b.column.date, b.minute, tz());
    if (end < start) [start, end] = [end, start];
    if (a.allDay) end = atMinute(addDays(dateKey(end, tz()), 1), 0, tz());
    else if (+start === +end)
      end = new Date(
        Math.min(
          +atMinute(dateKey(start, tz()), max(), tz()),
          +start + step() * MS_PER_MINUTE,
        ),
      );
    return {
      start,
      end,
      ...(a.column.resourceId === undefined
        ? {}
        : { resourceId: a.column.resourceId }),
      allDay: a.allDay,
      action: g.moved ? "select" : "click",
      box: { clientX: g.lastX, clientY: g.lastY, x: g.lastX, y: g.lastY },
    };
  }
  function changeFrom(g: Gesture<E>): EventChange<E> {
    const event = g.event!,
      hit = g.current;
    if (!g.edge && (view() === "month" || (g.origin.allDay && hit.allDay))) {
      const days = differenceInDays(g.origin.column.date, hit.column.date);
      return {
        event,
        start: shiftDate(event.start, days, tz()),
        end: shiftDate(event.end, days, tz()),
        ...(hit.column.resourceId === undefined
          ? view() === "month" && event.resourceId !== undefined
            ? { resourceId: event.resourceId }
            : {}
          : { resourceId: hit.column.resourceId }),
        allDay: !!event.allDay,
        action: "move",
      };
    }
    if (g.edge)
      return resizeEvent(
        event,
        g.edge,
        hit.column.date,
        view() === "month" && !event.allDay
          ? minuteOfDay(event[g.edge], tz())
          : hit.allDay && g.edge === "end"
            ? 1440
            : hit.minute,
        tz(),
        event.allDay ? 1440 : step(),
      );
    const target = atMinute(hit.column.date, hit.minute, tz());
    const start = new Date(
      +target - (hit.allDay || g.origin.allDay ? 0 : g.offset),
    );
    const result = moveEvent(
      event,
      dateKey(start, tz()),
      minuteOfDay(start, tz()),
      tz(),
      hit.column.resourceId,
    );
    if (hit.allDay && !event.allDay)
      result.end = atMinute(addDays(hit.column.date, 1), 0, tz());
    if (!hit.allDay && event.allDay)
      result.end = new Date(+result.start + step() * MS_PER_MINUTE);
    result.allDay = hit.allDay;
    return result;
  }
  function drawPreview() {
    root.querySelectorAll(".fc-preview").forEach((node) => node.remove());
    if (!gesture) return;
    const g = gesture,
      range = g.event ? changeFrom(g) : selectionFrom(g);
    const allowed = g.event
      ? options.canChangeEvent?.(range as EventChange<E>) !== false
      : options.onSelecting?.(range as SlotSelection) !== false;
    const preview = element(
      doc,
      "div",
      `fc-preview${allowed ? "" : " fc-preview-invalid"}`,
      `${timeLabel(range.start)} – ${timeLabel(range.end)}`,
    );
    if (!g.current.allDay) {
      const segments = splitEvent(
        { id: "preview", title: "", start: range.start, end: range.end },
        [g.current.column.date],
        tz(),
      );
      const segment = segments[0];
      if (segment)
        position(
          preview,
          Math.max(min(), segment.startMinute),
          Math.min(max(), segment.endMinute),
        );
    }
    g.current.node.append(preview);
  }
  function stopGesture() {
    const active = gesture;
    gesture = undefined;
    if (active && active.capture.hasPointerCapture(active.id))
      active.capture.releasePointerCapture(active.id);
    win.cancelAnimationFrame(raf);
    raf = 0;
    root.classList.remove("fc-interacting");
    root.querySelectorAll(".fc-preview").forEach((n) => n.remove());
  }
  function pointerUp(e: PointerEvent) {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    stopGesture();
    if (g.moved) {
      suppressClick = true;
      win.setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
    if (g.event) {
      if (g.moved) emitChange(changeFrom(g));
    } else emitSlot(selectionFrom(g));
  }
  function autoScroll() {
    if (!gesture) return;
    const rect = scroller.getBoundingClientRect();
    const { lastX: x, lastY: y } = gesture;
    const dx =
      x < rect.left + AUTO_SCROLL_EDGE
        ? -AUTO_SCROLL_SPEED
        : x > rect.right - AUTO_SCROLL_EDGE
          ? AUTO_SCROLL_SPEED
          : 0;
    const dy =
      y < rect.top + AUTO_SCROLL_EDGE
        ? -AUTO_SCROLL_SPEED
        : y > rect.bottom - AUTO_SCROLL_EDGE
          ? AUTO_SCROLL_SPEED
          : 0;
    if (gesture.moved && (dx || dy)) {
      scroller.scrollBy(dx, dy);
      const hit = hitAt(x, y);
      if (hit) gesture.current = hit;
      drawPreview();
    }
    raf = win.requestAnimationFrame(autoScroll);
  }
  function keyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && gesture) {
      stopGesture();
      announce("Cancelled");
    }
  }
  function externalDrop(e: DragEvent) {
    if (!options.getExternalEvent || !e.dataTransfer) return;
    const hit = hitAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    const event = options.getExternalEvent(e.dataTransfer);
    if (!event) return;
    const change = moveEvent(
      event,
      hit.column.date,
      hit.minute,
      tz(),
      hit.column.resourceId,
    );
    change.allDay = hit.allDay;
    if (hit.allDay && !event.allDay)
      change.end = atMinute(addDays(hit.column.date, 1), 0, tz());
    if (!hit.allDay && event.allDay)
      change.end = new Date(+change.start + step() * MS_PER_MINUTE);
    if (options.canChangeEvent?.(change) !== false)
      options.onExternalDrop?.(change);
  }
  function dragOver(e: DragEvent) {
    if (options.getExternalEvent && hitAt(e.clientX, e.clientY))
      e.preventDefault();
  }
  root.addEventListener("pointerdown", pointerDown);
  root.addEventListener("pointermove", pointerMove);
  root.addEventListener("pointerup", pointerUp);
  root.addEventListener("pointercancel", stopGesture);
  root.addEventListener("lostpointercapture", stopGesture);
  root.addEventListener("keydown", keyDown);
  root.addEventListener("drop", externalDrop);
  root.addEventListener("dragover", dragOver);
  win.addEventListener("blur", stopGesture);
  const timer = win.setInterval(updateNow, 60_000);
  try {
    render();
  } catch (error) {
    win.clearInterval(timer);
    win.removeEventListener("blur", stopGesture);
    root.remove();
    throw error;
  }
  function scrollToTime(minute: number) {
    scroller.scrollTop = Math.max(
      0,
      ((minute - min()) / 60) * (options.hourHeight ?? 64),
    );
  }
  if (options.scrollToMinute !== undefined)
    scrollToTime(options.scrollToMinute);
  return {
    update(next) {
      if (destroyed) throw new Error("Calendar has been destroyed");
      const merged = { ...options, ...next };
      validateOptions(merged);
      options = merged;
      render();
    },
    setOptions(next) {
      if (destroyed) throw new Error("Calendar has been destroyed");
      validateOptions(next);
      options = { ...next };
      render();
    },
    getOptions: () => ({ ...options }),
    scrollToTime,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopGesture();
      win.clearInterval(timer);
      win.removeEventListener("blur", stopGesture);
      root.remove();
    },
  };
}
