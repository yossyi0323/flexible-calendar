import {
  addDays,
  atMinute,
  buildColumns,
  dateKey,
  differenceInDays,
  shiftDate,
  minuteOfDay,
  moveEvent,
  eventResourceIds,
  resizeEvent,
  MS_PER_MINUTE,
  type CalendarEvent,
  type Column,
  type DateKey,
  type EventChange,
} from "../core/index.js";
import { element } from "./helpers.js";
import type { CalendarContext } from "./context.js";
export function createKeyboardController<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
) {
  let activeMinute = ctx.options.scrollToMinute ?? 9 * 60;
  function eventKeyboard(source: KeyboardEvent, event: E, date: DateKey) {
    const { options, tz, view, step, canEdit, emitChange } = ctx;
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
  function showKeyboardCursor(cell: HTMLElement, column: Column) {
    const { doc, tz, step, min, max, timeLabel, position } = ctx;
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
    const { options, root, tz, step, min, max, timeLabel, announce, emitSlot } =
      ctx;
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
    const { tz, emitSlot } = ctx;
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
  return { eventKeyboard, showKeyboardCursor, slotKeyboard, dayKeyboard };
}
