import {
  addDays,
  atMinute,
  buildColumns,
  eventResourceIds,
  type CalendarEvent,
  type Column,
} from "../core/index.js";
import type { CalendarOptions } from "./types.js";
import type { CalendarContext } from "./context.js";
import { renderAllDayCell, renderTimeColumn } from "./time-view.js";
export interface EventSnapshot<E extends CalendarEvent> {
  event: E;
  start: number;
  end: number;
  resources: readonly string[];
  fingerprint: string;
  index: number;
}
export function snapshotEvents<E extends CalendarEvent>(
  events: readonly E[],
): Map<string, EventSnapshot<E>> {
  return new Map(
    events.map((event, index) => [
      event.id,
      {
        event,
        index,
        start: +event.start,
        end: +event.end,
        resources: [...eventResourceIds(event)],
        fingerprint: JSON.stringify([
          +event.start,
          +event.end,
          event.resourceId,
          event.title,
          event.allDay,
          event.color,
          event.editable,
        ]),
      },
    ]),
  );
}
const CALLBACK_KEYS = new Set([
  "onSelectSlot",
  "onSelecting",
  "onSelectEvent",
  "onDoubleClickEvent",
  "onEventChange",
  "canChangeEvent",
  "onNavigate",
  "onViewChange",
  "onRangeChange",
  "onDrillDown",
  "onShowMore",
  "getExternalEvent",
  "onExternalDrop",
  "onBeforeRender",
  "onRender",
]);
/** Return null for structural changes. An empty array is a valid no-DOM-change update. */
export function changedTimeColumns<E extends CalendarEvent>(
  previous: CalendarOptions<E>,
  next: CalendarOptions<E>,
  before: Map<string, EventSnapshot<E>>,
  after: Map<string, EventSnapshot<E>>,
): Column[] | null {
  const view = next.view ?? "week";
  if (
    !["day", "week", "work-week", "vertical"].includes(view) ||
    next.customViews?.[view]
  )
    return null;
  for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    if (key === "events" || CALLBACK_KEYS.has(key)) continue;
    const field = key as keyof CalendarOptions<E>;
    if (
      key === "date"
        ? +previous.date !== +next.date
        : !Object.is(previous[field], next[field])
    )
      return null;
  }
  const touched: EventSnapshot<E>[] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const a = before.get(id),
      b = after.get(id);
    if (
      a?.event === b?.event &&
      a?.fingerprint === b?.fingerprint &&
      a?.index === b?.index
    )
      continue;
    if (a) touched.push(a);
    if (b) touched.push(b);
  }
  if (!touched.length) return [];
  const boundaries = new Map<string, { start: number; end: number }>();
  return buildColumns(next).filter((column) => {
    let day = boundaries.get(column.date);
    if (!day) {
      day = {
        start: +atMinute(column.date, 0, next.timeZone),
        end: +atMinute(addDays(column.date, 1), 0, next.timeZone),
      };
      boundaries.set(column.date, day);
    }
    return touched.some(
      (event) =>
        event.start < day.end &&
        event.end > day.start &&
        (column.resourceId === undefined ||
          event.resources.includes(column.resourceId)),
    );
  });
}
export function patchTimeColumns<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
  columns: readonly Column[],
): void {
  const timed = new Map(
    [...ctx.root.querySelectorAll<HTMLElement>(".fc-time-column")].map(
      (node) => [node.dataset.columnKey, node],
    ),
  );
  const allDay = new Map(
    [...ctx.root.querySelectorAll<HTMLElement>(".fc-all-day-cell")].map(
      (node) => [node.dataset.columnKey, node],
    ),
  );
  for (const column of columns) {
    timed.get(column.key)?.replaceWith(renderTimeColumn(ctx, column));
    allDay.get(column.key)?.replaceWith(renderAllDayCell(ctx, column));
  }
}
