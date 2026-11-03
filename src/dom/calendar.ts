import {
  addDays,
  atMinute,
  dateKey,
  defaultTimeZone,
  indexSegments,
  minuteOfDay,
  getViewDates,
  type CalendarEvent,
  type Column,
  type DateKey,
  type EventChange,
  type SlotSelection,
  type View,
  type Segment,
} from "../core/index.js";
import { applyStyle, element, englishMessages, setContent } from "./helpers.js";
import type { CalendarContext } from "./context.js";
import { validateOptions } from "./options.js";
import type { CalendarHandle, CalendarOptions } from "./types.js";
import { toolbar } from "./toolbar.js";
import { timeView } from "./time-view.js";
import { monthView } from "./month-view.js";
import { agendaView } from "./agenda-view.js";
import { eventNode } from "./event-node.js";
import { createKeyboardController } from "./keyboard.js";
import { createPointerController } from "./pointer.js";
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
  let destroyed = false;
  const viewCleanups: (() => void)[] = [];
  let pendingOptions: CalendarOptions<E> | undefined;
  let eventIndex: Map<DateKey, Segment<E>[]> | undefined;
  let backgroundIndex: Map<DateKey, Segment<E>[]> | undefined;
  const formatters = new Map<string, Intl.DateTimeFormat>();
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
  const fmt = (date: Date, format: Intl.DateTimeFormatOptions) => {
    const key = JSON.stringify([locale(), tz(), format]);
    let formatter = formatters.get(key);
    if (!formatter) {
      if (formatters.size >= 32) formatters.clear();
      formatter = new Intl.DateTimeFormat(locale(), {
        ...format,
        timeZone: tz(),
      });
      formatters.set(key, formatter);
    }
    return formatter.format(date);
  };
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

  function position(node: HTMLElement, start: number, end: number) {
    node.style.top = `${((start - min()) / (max() - min())) * 100}%`;
    node.style.height = `${((end - start) / (max() - min())) * 100}%`;
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
    pointer.stopGesture();
    for (const cleanup of viewCleanups.splice(0)) cleanup();
    eventIndex = undefined;
    backgroundIndex = undefined;
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
    if (options.toolbar !== false) toolbar(ctx);
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
          renderEvent: ctx.eventNode,
          selectSlot: emitSlot,
          changeEvent: emitChange,
        }),
      );
    else if (view() === "month") monthView(ctx);
    else if (view() === "agenda") agendaView(ctx);
    else timeView(ctx);
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

  const ctx: CalendarContext<E> = {
    get options() {
      return options;
    },
    doc,
    win,
    root,
    get scroller() {
      return scroller;
    },
    expanded,
    tz,
    view,
    step,
    min,
    max,
    messages,
    fmt,
    dayLabel,
    timeLabel,
    announce,
    canEdit,
    dates,
    isToday,
    emitChange,
    emitSlot,
    setDate,
    setView,
    drillDown,
    render,
    decorateDay,
    setHitData,
    position,
    updateNow,
    eventNode: (event, date, timed) => eventNode(ctx, event, date, timed),
    eventKeyboard: (...args) => keyboard.eventKeyboard(...args),
    showKeyboardCursor: (...args) => keyboard.showKeyboardCursor(...args),
    slotKeyboard: (...args) => keyboard.slotKeyboard(...args),
    dayKeyboard: (...args) => keyboard.dayKeyboard(...args),
    segmentsForDay: (date, background = false) => {
      if (background)
        return (
          (backgroundIndex ??= indexSegments(
            options.backgroundEvents ?? [],
            dates(),
            tz(),
          )).get(date) ?? []
        );
      return (
        (eventIndex ??= indexSegments(options.events, dates(), tz())).get(
          date,
        ) ?? []
      );
    },
    onViewCleanup: (cleanup) => viewCleanups.push(cleanup),
    flushUpdates,
    isClickSuppressed: () => pointer.isClickSuppressed(),
  };
  const keyboard = createKeyboardController(ctx);
  const pointer = createPointerController(ctx);
  const timer = win.setInterval(updateNow, 60_000);
  try {
    render();
  } catch (error) {
    win.clearInterval(timer);
    pointer.destroy();
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
  function flushUpdates() {
    if (!pendingOptions || destroyed) return;
    options = pendingOptions;
    pendingOptions = undefined;
    render();
  }
  function applyOptions(next: CalendarOptions<E>) {
    validateOptions(next);
    if (pointer.isActive()) {
      pendingOptions = next;
      const active = pointer.activeEvent();
      const updated =
        active && next.events.find((event) => event.id === active.id);
      if (
        active &&
        (!updated ||
          +updated.start !== +active.start ||
          +updated.end !== +active.end ||
          JSON.stringify(updated.resourceId) !==
            JSON.stringify(active.resourceId))
      ) {
        pointer.stopGesture();
        flushUpdates();
      }
      return;
    }
    pendingOptions = undefined;
    options = next;
    render();
  }
  return {
    update(next) {
      if (destroyed) throw new Error("Calendar has been destroyed");
      applyOptions({ ...(pendingOptions ?? options), ...next });
    },
    setOptions(next) {
      if (destroyed) throw new Error("Calendar has been destroyed");
      applyOptions({ ...next });
    },
    getOptions: () => ({ ...options }),
    scrollToTime,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const cleanup of viewCleanups.splice(0)) cleanup();
      pointer.stopGesture();
      win.clearInterval(timer);
      pointer.destroy();
      root.remove();
    },
  };
}
