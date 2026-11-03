import {
  atMinute,
  buildColumns,
  layoutSegments,
  matchesResource,
  type CalendarEvent,
} from "../core/index.js";
import { applyStyle, button, element, setContent } from "./helpers.js";
import type { CalendarContext } from "./context.js";
export function timeView<E extends CalendarEvent>(ctx: CalendarContext<E>) {
  const {
    options,
    segmentsForDay,
    doc,
    scroller,
    tz,
    step,
    min,
    max,
    messages,
    dayLabel,
    timeLabel,
    drillDown,
    eventNode,
    decorateDay,
    setHitData,
    position,
    showKeyboardCursor,
    slotKeyboard,
    dayKeyboard,
    updateNow,
  } = ctx;
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
    for (const event of segmentsForDay(column.date)
      .map((s) => s.event)
      .filter((e) => e.allDay && matchesResource(e, column.resourceId)))
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
    const segments = segmentsForDay(column.date)
      .filter(
        (s) => !s.event.allDay && matchesResource(s.event, column.resourceId),
      )
      .map((s) => ({
        ...s,
        startMinute: Math.max(min(), s.startMinute),
        endMinute: Math.min(
          max(),
          s.endMinute <= s.startMinute ? s.startMinute + step() : s.endMinute,
        ),
      }))
      .filter((s) => s.startMinute < s.endMinute);
    for (const s of segmentsForDay(column.date, true).filter((s) =>
      matchesResource(s.event, column.resourceId),
    )) {
      const node = element(doc, "div", "fc-background-event");
      node.setAttribute("aria-hidden", "true");
      if (s.event.color) node.style.backgroundColor = s.event.color;
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
