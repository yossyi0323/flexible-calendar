import type { CalendarEvent, Resource, ResourceAssignment } from "./types.js";
/** Typed field names or functions; source records stay available on normalized values. */
export type Accessor<T, V> =
  | ((source: T) => V)
  | { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
export function readAccessor<T, V>(source: T, accessor: Accessor<T, V>): V {
  return typeof accessor === "function"
    ? (accessor as (source: T) => V)(source)
    : (source[accessor as keyof T] as V);
}
export interface EventAccessors<T> {
  id: Accessor<T, string>;
  title: Accessor<T, string>;
  start: Accessor<T, Date>;
  end: Accessor<T, Date>;
  allDay?: Accessor<T, boolean>;
  resourceId?: Accessor<T, ResourceAssignment>;
  color?: Accessor<T, string>;
  editable?: Accessor<T, boolean>;
}
export type AdaptedEvent<T> = CalendarEvent & { source: T };
export function adaptEvents<T>(
  records: readonly T[],
  accessors: EventAccessors<T>,
): AdaptedEvent<T>[] {
  return records.map((source) => ({
    id: readAccessor(source, accessors.id),
    title: readAccessor(source, accessors.title),
    start: readAccessor(source, accessors.start),
    end: readAccessor(source, accessors.end),
    source,
    ...(accessors.allDay === undefined
      ? {}
      : { allDay: readAccessor(source, accessors.allDay) }),
    ...(accessors.resourceId === undefined
      ? {}
      : { resourceId: readAccessor(source, accessors.resourceId) }),
    ...(accessors.color === undefined
      ? {}
      : { color: readAccessor(source, accessors.color) }),
    ...(accessors.editable === undefined
      ? {}
      : { editable: readAccessor(source, accessors.editable) }),
  }));
}
export function adaptResources<T>(
  records: readonly T[],
  accessors: { id: Accessor<T, string>; title: Accessor<T, string> },
): (Resource & { source: T })[] {
  return records.map((source) => ({
    id: readAccessor(source, accessors.id),
    title: readAccessor(source, accessors.title),
    source,
  }));
}
