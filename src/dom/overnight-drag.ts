import {
  addDays,
  atMinute,
  indexSegments,
  type CalendarEvent,
} from "../core/index.js";
import type { CalendarContext } from "./context.js";
import { applyStyle, element } from "./helpers.js";
import { appendTimedEvents } from "./time-view.js";

/** Temporary next-day hours keep a downward drag continuous across midnight. */
export function extendOvernightDrag<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
) {
  const body = ctx.root.querySelector<HTMLElement>(".fc-time-body");
  const gutter = ctx.root.querySelector<HTMLElement>(".fc-time-gutter");
  if (!body || !gutter || ctx.max() !== 1440) return;
  const hourHeight = ctx.options.hourHeight ?? 64;
  const originalHeight = ((ctx.max() - ctx.min()) / 60) * hourHeight;
  const saved = new Map<HTMLElement, string | null>();
  const savedClasses = new Map<HTMLElement, string>();
  const remember = (node: HTMLElement) =>
    saved.set(node, node.getAttribute("style"));
  remember(body);
  // Freeze existing positions before growing their containing columns.
  for (const node of body.querySelectorAll<HTMLElement>(
    ".fc-timed-event, .fc-background-event, .fc-now, .fc-keyboard-cursor, .fc-time-label",
  )) {
    remember(node);
    const style = ctx.win.getComputedStyle(node);
    const top = style.top,
      height = style.height;
    node.style.top = top;
    if (!node.classList.contains("fc-time-label")) node.style.height = height;
  }
  // One extra day is available during the gesture, including in a single-day view.
  const endMinute = 2880;
  body.style.height = `${originalHeight + 24 * hourHeight}px`;
  const temporary: HTMLElement[] = [];
  const dates = ctx.dates();
  for (let minute = 1440; minute < endMinute; minute += 60) {
    const label = element(
      ctx.doc,
      "span",
      "fc-time-label fc-next-day-label",
      `${ctx.timeLabel(atMinute(dates[0]!, minute, ctx.tz()))} +1`,
    );
    label.style.top = `${((minute - ctx.min()) / 60) * hourHeight}px`;
    gutter.append(label);
    temporary.push(label);
  }
  const visibleDates = new Set(dates);
  const outsideView = indexSegments(
    ctx.options.events,
    dates
      .map((date) => addDays(date, 1))
      .filter((date) => !visibleDates.has(date)),
    ctx.tz(),
  );
  for (const column of body.querySelectorAll<HTMLElement>(".fc-time-column")) {
    const date = addDays(column.dataset.date!, 1);
    // Lay out a continuous two-day interval so overlap lanes stay consistent
    // across midnight. Join by event identity, never by title.
    const segments = ctx
      .segmentsForDay(column.dataset.date!)
      .map((s) => ({ ...s }));
    for (const next of outsideView.get(date) ?? ctx.segmentsForDay(date)) {
      const current = segments.find((s) => s.event.id === next.event.id);
      if (current && current.continuesAfter && next.continuesBefore) {
        current.end = next.end;
        current.endMinute = 1440 + next.endMinute;
        current.continuesAfter = next.continuesAfter;
      } else {
        segments.push({
          ...next,
          startMinute: 1440 + next.startMinute,
          endMinute: 1440 + next.endMinute,
        });
      }
    }
    const existing = new Map(
      Array.from(
        column.querySelectorAll<HTMLElement>(".fc-timed-event"),
        (node) => [node.dataset.eventId, node],
      ),
    );
    appendTimedEvents(
      ctx,
      column,
      segments,
      column.dataset.resourceId,
      ctx.min(),
      endMinute,
      (event) => {
        const original = existing.get(event.id);
        if (original) {
          savedClasses.set(original, original.className);
          original.classList.remove(
            "fc-continues-before",
            "fc-continues-after",
          );
          return original;
        }
        const node = element(ctx.doc, "div", "fc-event fc-next-day-event");
        node.inert = true;
        if (event.color)
          node.style.setProperty("--fc-event-color", event.color);
        applyStyle(node, ctx.options.eventStyle?.(event));
        node.style.pointerEvents = "none";
        node.append(element(ctx.doc, "span", "fc-event-content", event.title));
        temporary.push(node);
        return node;
      },
      (node, start, end) => {
        node.style.top = `${((start - ctx.min()) / 60) * hourHeight}px`;
        node.style.height = `${((end - start) / 60) * hourHeight}px`;
      },
    );
  }
  body.classList.add("fc-overnight-drag");
  return {
    endMinute,
    restore() {
      for (const node of temporary) node.remove();
      for (const [node, className] of savedClasses) node.className = className;
      for (const [node, style] of saved) {
        if (style === null) node.removeAttribute("style");
        else node.setAttribute("style", style);
      }
      body.classList.remove("fc-overnight-drag");
    },
  };
}
