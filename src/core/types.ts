export type DateKey = string;
export type BuiltInView =
  "day" | "week" | "work-week" | "month" | "agenda" | "vertical";
export type View = BuiltInView | (string & {});
export type ResourceAssignment = string | readonly string[];
export interface CustomView {
  label: string;
  dates: (date: Date, timeZone: string) => readonly DateKey[];
  navigate: (date: Date, direction: -1 | 1, timeZone: string) => Date;
}
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  /** Exclusive end; midnight belongs to the following day. */
  end: Date;
  resourceId?: ResourceAssignment;
  allDay?: boolean;
  color?: string;
  editable?: boolean;
}
export interface Resource {
  id: string;
  title: string;
  color?: string;
}
export interface DateRange {
  start: Date;
  end: Date;
}
export interface Column {
  key: string;
  date: DateKey;
  resourceId?: string;
  title: string;
}
export interface Segment<
  E extends CalendarEvent = CalendarEvent,
> extends DateRange {
  event: E;
  date: DateKey;
  startMinute: number;
  endMinute: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}
export interface PositionedSegment<
  E extends CalendarEvent = CalendarEvent,
> extends Segment<E> {
  lane: number;
  lanes: number;
  left: number;
  width: number;
}
export interface SlotSelection extends DateRange {
  resourceId?: string;
  allDay: boolean;
  action: "click" | "select" | "keyboard";
  box?: { clientX: number; clientY: number; x: number; y: number };
}
export interface EventChange<
  E extends CalendarEvent = CalendarEvent,
> extends DateRange {
  event: E;
  resourceId?: ResourceAssignment;
  allDay: boolean;
  action: "move" | "resize-start" | "resize-end";
}
export interface CalendarConfig<E extends CalendarEvent = CalendarEvent> {
  events: readonly E[];
  date: Date;
  view?: View;
  /** Use six weeks even when the month fits in four or five. Default false. */
  monthFixedWeeks?: boolean;
  customViews?: Readonly<Record<string, CustomView>>;
  /** Explicit IANA zone; defaults to the host's zone. */
  timeZone?: string;
  locale?: string;
  weekStartsOn?: number;
  /** Number of days for vertical / agenda views. */
  days?: number;
  resources?: readonly Resource[];
  /** Per-date resources override the global resources. */
  resourcesForDate?: (date: DateKey) => readonly Resource[];
  minMinute?: number;
  maxMinute?: number;
  step?: number;
}
