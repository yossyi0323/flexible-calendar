import { atMinute, type CalendarEvent } from "../core/index.js";
import type { CalendarContext } from "./context.js";
import { element } from "./helpers.js";

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
  const labels: HTMLElement[] = [];
  for (let minute = 1440; minute < endMinute; minute += 60) {
    const label = element(
      ctx.doc,
      "span",
      "fc-time-label fc-next-day-label",
      `${ctx.timeLabel(atMinute(ctx.dates()[0]!, minute, ctx.tz()))} +1`,
    );
    label.style.top = `${((minute - ctx.min()) / 60) * hourHeight}px`;
    gutter.append(label);
    labels.push(label);
  }
  body.classList.add("fc-overnight-drag");
  return {
    endMinute,
    restore() {
      for (const label of labels) label.remove();
      for (const [node, style] of saved) {
        if (style === null) node.removeAttribute("style");
        else node.setAttribute("style", style);
      }
      body.classList.remove("fc-overnight-drag");
    },
  };
}
