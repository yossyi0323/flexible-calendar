import {
  atMinute,
  dateKey,
  layoutMonthWeek,
  type CalendarEvent,
  type DateKey,
  type MonthSpan,
} from "../core/index.js";
import { button, element } from "./helpers.js";
import type { CalendarContext } from "./context.js";
import { createMonthPopup } from "./month-popup.js";
const DATE_HEADER_HEIGHT = 32;
const EVENT_ROW_HEIGHT = 24;
const MORE_ROW_HEIGHT = 28;
export function monthView<E extends CalendarEvent>(ctx: CalendarContext<E>) {
  const { doc, dates, fmt, tz, scroller, options } = ctx;
  const grid = element(doc, "div", "fc-month");
  const range = dates();
  const headings = element(doc, "div", "fc-month-weekdays");
  for (const day of range.slice(0, 7))
    headings.append(
      element(
        doc,
        "div",
        "fc-weekday",
        fmt(atMinute(day, 720, tz()), { weekday: "short" }),
      ),
    );
  grid.append(headings);
  grid.style.setProperty("--fc-week-count", String(range.length / 7));
  const popup = createMonthPopup(ctx);
  for (let offset = 0; offset < range.length; offset += 7) {
    const weekDates = range.slice(offset, offset + 7);
    const events = [
      ...new Map(
        weekDates.flatMap((day) =>
          ctx.segmentsForDay(day).map((s) => [s.event.id, s.event] as const),
        ),
      ).values(),
    ];
    const spans = layoutMonthWeek(events, weekDates, tz());
    const laneCount = spans.reduce(
      (count, span) => Math.max(count, span.lane + 1),
      0,
    );
    const limit = weekDates.some((day) => ctx.expanded.has(day))
      ? laneCount
      : (options.monthMaxEvents ?? 3);
    const week = element(doc, "div", "fc-month-week");
    const visibleRows = Math.min(laneCount, limit);
    week.style.minHeight = `${Math.max(112, DATE_HEADER_HEIGHT + visibleRows * EVENT_ROW_HEIGHT + MORE_ROW_HEIGHT)}px`;
    for (const [index, day] of weekDates.entries()) {
      const cell = dayCell(ctx, day);
      const hidden = spans.filter(
        (s) => s.lane >= limit && s.startColumn <= index && s.endColumn > index,
      ).length;
      if (hidden) {
        const all = ctx.segmentsForDay(day).map((s) => s.event);
        const more = button(
          doc,
          ctx.messages().more(hidden),
          () => {
            if (options.onShowMore) options.onShowMore(all, day);
            else if (options.monthOverflow === "expand") {
              ctx.expanded.add(day);
              ctx.render();
            } else popup(all, day, more);
          },
          "fc-show-more",
        );
        more.setAttribute(
          "aria-label",
          `${ctx.dayLabel(day)} ${ctx.messages().more(hidden)}`,
        );
        if (options.monthOverflow !== "expand" && !options.onShowMore)
          more.setAttribute("aria-haspopup", "dialog");
        cell.append(more);
      }
      week.append(cell);
    }
    const layer = element(doc, "div", "fc-month-events");
    for (const span of spans)
      if (span.lane < limit) layer.append(spanNode(ctx, span, weekDates));
    week.append(layer);
    grid.append(week);
  }
  scroller.append(grid);
}
function dayCell<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
  day: DateKey,
) {
  const {
    doc,
    options,
    tz,
    fmt,
    dayLabel,
    decorateDay,
    setHitData,
    dayKeyboard,
    drillDown,
  } = ctx;
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
  return cell;
}
function spanNode<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
  span: MonthSpan<E>,
  dates: DateKey[],
) {
  const node = ctx.eventNode(span.event, dates[span.startColumn]!);
  node.classList.add("fc-month-event");
  node.style.gridColumn = `${span.startColumn + 1} / ${span.endColumn + 1}`;
  node.style.gridRow = String(span.lane + 1);
  node.dataset.spanDays = String(span.endColumn - span.startColumn);
  if (span.continuesBefore) {
    node.classList.add("fc-span-before");
    node.querySelector('[data-edge="start"]')?.remove();
  }
  if (span.continuesAfter) {
    node.classList.add("fc-span-after");
    node.querySelector('[data-edge="end"]')?.remove();
  }
  return node;
}
