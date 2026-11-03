import {
  addDays,
  atMinute,
  dateKey,
  differenceInDays,
  shiftDate,
  minuteOfDay,
  moveEvent,
  resizeEvent,
  snapMinute,
  splitEvent,
  MS_PER_MINUTE,
  type CalendarEvent,
  type Column,
  type EventChange,
  type SlotSelection,
} from "../core/index.js";
import { element } from "./helpers.js";
import { extendOvernightDrag } from "./overnight-drag.js";
import type { CalendarContext } from "./context.js";
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
  horizontal?: { start: string; width: string };
};
const DRAG_THRESHOLD = 5;
const AUTO_SCROLL_EDGE = 40;
const AUTO_SCROLL_SPEED = 12;

export function createPointerController<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
) {
  const { root, win } = ctx;
  let gesture: Gesture<E> | undefined;
  let overnight: ReturnType<typeof extendOvernightDrag<E>>;
  let raf = 0,
    suppressClick = false;
  function hitAt(x: number, y: number): Hit | undefined {
    const { doc, step, min, max } = ctx;
    const endMinute = overnight?.endMinute ?? max();
    const pointed = doc.elementFromPoint(x, y);
    let target = pointed?.closest<HTMLElement>("[data-column-key]");
    if (!target) {
      const week = pointed?.closest<HTMLElement>(".fc-month-week");
      target = [
        ...(week?.querySelectorAll<HTMLElement>(".fc-month-day") ?? []),
      ].find((cell) => {
        const rect = cell.getBoundingClientRect();
        return (
          x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom
        );
      });
    }
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
            min() + ((y - rect.top) / rect.height) * (endMinute - min()),
            step(),
            min(),
            endMinute,
          ),
      node: target,
    };
  }
  function pointerDown(e: PointerEvent) {
    const { options, tz, canEdit } = ctx;
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
      // Keep the rendered overlap lane, including its gap and RTL position.
      // Percentages remain relative to the destination column when moving.
      ...(capture.classList.contains("fc-timed-event")
        ? {
            horizontal: {
              start: capture.style.insetInlineStart,
              width: capture.style.width,
            },
          }
        : {}),
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      offset: event
        ? +atMinute(hit.column.date, hit.minute, tz()) - +event.start
        : 0,
    };
    if (!hit.allDay && (!event || edge === "end"))
      overnight = extendOvernightDrag(ctx);
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
    const { tz, step, max } = ctx;
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
    const { tz, view, step } = ctx;
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
    const { options, doc, tz, min, max, timeLabel, position } = ctx;
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
      if (g.horizontal) {
        preview.style.insetInlineStart = g.horizontal.start;
        preview.style.insetInlineEnd = "auto";
        preview.style.width = g.horizontal.width;
      }
      if (overnight) {
        const wallMinute = (date: Date) =>
          differenceInDays(g.current.column.date, dateKey(date, tz())) * 1440 +
          minuteOfDay(date, tz());
        const start = Math.max(min(), wallMinute(range.start));
        const end = Math.min(overnight.endMinute, wallMinute(range.end));
        preview.style.top = `${((start - min()) / 60) * (options.hourHeight ?? 64)}px`;
        preview.style.height = `${(Math.max(0, end - start) / 60) * (options.hourHeight ?? 64)}px`;
      } else {
        const segment = splitEvent(
          { id: "preview", title: "", start: range.start, end: range.end },
          [g.current.column.date],
          tz(),
        )[0];
        if (segment)
          position(
            preview,
            Math.max(min(), segment.startMinute),
            Math.min(max(), segment.endMinute),
          );
      }
    }
    g.current.node.append(preview);
  }
  function stopGesture() {
    const active = gesture;
    gesture = undefined;
    overnight?.restore();
    overnight = undefined;
    if (active && active.capture.hasPointerCapture(active.id))
      active.capture.releasePointerCapture(active.id);
    win.cancelAnimationFrame(raf);
    raf = 0;
    root.classList.remove("fc-interacting");
    root.querySelectorAll(".fc-preview").forEach((n) => n.remove());
  }
  function pointerUp(e: PointerEvent) {
    const { emitChange, emitSlot } = ctx;
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    stopGesture();
    ctx.flushUpdates();
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
    const { scroller } = ctx;
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
    const { announce } = ctx;
    if (e.key === "Escape" && gesture) {
      cancelGesture();
      announce("Cancelled");
    }
  }
  function externalDrop(e: DragEvent) {
    const { options, tz, step } = ctx;
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
    const { options } = ctx;
    if (options.getExternalEvent && hitAt(e.clientX, e.clientY))
      e.preventDefault();
  }
  function cancelGesture() {
    const active = !!gesture;
    stopGesture();
    if (active) ctx.flushUpdates();
  }
  root.addEventListener("pointerdown", pointerDown);
  root.addEventListener("pointermove", pointerMove);
  root.addEventListener("pointerup", pointerUp);
  root.addEventListener("pointercancel", cancelGesture);
  root.addEventListener("lostpointercapture", cancelGesture);
  root.addEventListener("keydown", keyDown);
  root.addEventListener("drop", externalDrop);
  root.addEventListener("dragover", dragOver);
  win.addEventListener("blur", cancelGesture);

  return {
    stopGesture,
    isActive: () => !!gesture,
    activeEvent: () => gesture?.event,
    isClickSuppressed: () => suppressClick,
    destroy: () => {
      stopGesture();
      win.removeEventListener("blur", cancelGesture);
    },
  };
}
