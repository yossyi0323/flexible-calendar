import {
  atMinute,
  dateKey,
  eventsInDay,
  type CalendarEvent,
} from "../core/index.js";
import { button, element } from "./helpers.js";
import type { CalendarContext } from "./context.js";
export function monthView<E extends CalendarEvent>(ctx: CalendarContext<E>) {
  const {
    options,
    doc,
    scroller,
    expanded,
    tz,
    messages,
    fmt,
    dayLabel,
    dates,
    drillDown,
    render,
    eventNode,
    decorateDay,
    setHitData,
    dayKeyboard,
  } = ctx;
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
