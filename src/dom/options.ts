import { validateConfig, type CalendarEvent } from "../core/index.js";
import type { CalendarOptions } from "./types.js";
export function validateOptions<E extends CalendarEvent>(
  options: CalendarOptions<E>,
): void {
  validateConfig(options);
  if (
    options.customViews?.[options.view ?? "week"] &&
    !options.customViewRenderers?.[options.view ?? "week"]
  )
    throw new RangeError("Custom view requires a renderer");
  for (const key of ["hourHeight", "columnWidth"] as const) {
    const value = options[key];
    if (value !== undefined && (!Number.isFinite(value) || value <= 0))
      throw new RangeError(`${key} must be positive`);
  }
  if (
    typeof options.height === "number" &&
    (!Number.isFinite(options.height) || options.height <= 0)
  )
    throw new RangeError("height must be positive");
  if (
    options.monthMaxEvents !== undefined &&
    (!Number.isInteger(options.monthMaxEvents) || options.monthMaxEvents < 0)
  )
    throw new RangeError("monthMaxEvents must be a nonnegative integer");
  if (options.timeGridGuides) {
    const interval = options.timeGridGuides.interval ?? 180;
    if (!Number.isInteger(interval) || interval <= 0 || 1440 % interval !== 0)
      throw new RangeError(
        "timeGridGuides.interval must be a positive integer divisor of 1440",
      );
  }
  if (options.backgroundEvents)
    validateConfig({ ...options, events: options.backgroundEvents });
}
