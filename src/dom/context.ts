import type {
  CalendarEvent,
  Column,
  DateKey,
  EventChange,
  SlotSelection,
  View,
  Segment,
} from "../core/index.js";
import type { CalendarOptions, Messages } from "./types.js";
/** Private, typed services passed to renderers/controllers. Mutable state stays with its owner. */
export interface CalendarContext<E extends CalendarEvent> {
  readonly options: CalendarOptions<E>;
  readonly doc: Document;
  readonly win: Window;
  readonly root: HTMLElement;
  readonly scroller: HTMLElement;
  readonly expanded: Set<DateKey>;
  tz: () => string;
  view: () => View;
  step: () => number;
  min: () => number;
  max: () => number;
  messages: () => Messages;
  fmt: (date: Date, format: Intl.DateTimeFormatOptions) => string;
  dayLabel: (date: DateKey) => string;
  timeLabel: (date: Date) => string;
  announce: (message: string) => void;
  canEdit: (event: E) => boolean;
  dates: () => DateKey[];
  isToday: (date: DateKey) => boolean;
  emitChange: (change: EventChange<E>) => void;
  emitSlot: (selection: SlotSelection) => void;
  setDate: (date: Date) => void;
  setView: (view: View) => void;
  drillDown: (date: DateKey) => void;
  render: () => void;
  eventNode: (event: E, date: DateKey, timed?: boolean) => HTMLButtonElement;
  eventKeyboard: (source: KeyboardEvent, event: E, date: DateKey) => void;
  decorateDay: (node: HTMLElement, date: DateKey) => void;
  setHitData: (node: HTMLElement, column: Column, allDay: boolean) => void;
  position: (node: HTMLElement, start: number, end: number) => void;
  showKeyboardCursor: (cell: HTMLElement, column: Column) => void;
  slotKeyboard: (
    event: KeyboardEvent,
    column: Column,
    cell: HTMLElement,
  ) => void;
  dayKeyboard: (event: KeyboardEvent, column: Column) => void;
  updateNow: () => void;
  segmentsForDay: (
    date: DateKey,
    background?: boolean,
  ) => readonly Segment<E>[];
  onViewCleanup: (cleanup: () => void) => void;
  flushUpdates: () => void;
  isClickSuppressed: () => boolean;
}
