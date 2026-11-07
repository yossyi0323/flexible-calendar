import type { CalendarEvent, Column } from "../core/index.js";
import type { CalendarContext } from "./context.js";
import { element, setContent } from "./helpers.js";

/** Pixel positions use the same local wall-clock axis as timed segments. */
export function appendTimeGridGuides<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
  cell: HTMLElement,
  column: Column,
  start: number,
  end: number,
) {
  const options = ctx.options.timeGridGuides;
  if (!options) return;
  const layer = element(ctx.doc, "div", "fc-time-guides");
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  const interval = options.interval ?? 180;
  for (
    let minute = Math.ceil(start / interval) * interval;
    minute < end;
    minute += interval
  ) {
    const guide = element(
      ctx.doc,
      "div",
      `fc-time-guide fc-time-guide-${options.style ?? "lines"}`,
    );
    guide.style.top = `${((minute - ctx.min()) / 60) * (ctx.options.hourHeight ?? 64)}px`;
    if (options.style === "labels") {
      const dayOffset = Math.floor(minute / 1440);
      const localMinute = minute % 1440;
      const label = element(ctx.doc, "span", "fc-time-guide-label");
      setContent(
        label,
        options.renderLabel?.({ column, minute: localMinute, dayOffset }) ??
          `${String(Math.floor(localMinute / 60)).padStart(2, "0")}:${String(localMinute % 60).padStart(2, "0")}${dayOffset ? ` +${dayOffset}` : ""}`,
      );
      guide.append(label);
    }
    layer.append(guide);
  }
  cell.append(layer);
  return layer;
}
