import type {
  CalendarConfig,
  CalendarEvent,
  Column,
  DateKey,
  DateRange,
  EventChange,
  SlotSelection,
  View,
  Segment,
  PositionedSegment,
} from "../core/index.js";
export type Content = string | Node;
export interface Messages {
  today: string;
  close: string;
  previous: string;
  next: string;
  allDay: string;
  noEvents: string;
  day: string;
  week: string;
  "work-week": string;
  month: string;
  agenda: string;
  vertical: string;
  more: (count: number) => string;
}
export interface ElementStyle {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
}
export interface CalendarOptions<
  E extends CalendarEvent = CalendarEvent,
> extends CalendarConfig<E> {
  height?: number | string;
  hourHeight?: number;
  columnWidth?: number;
  theme?: "light" | "dark" | "auto";
  direction?: "ltr" | "rtl";
  toolbar?: boolean;
  customViewRenderers?: Readonly<
    Record<
      string,
      (context: {
        document: Document;
        dates: readonly DateKey[];
        events: readonly E[];
        renderEvent: (event: E, date: DateKey) => HTMLElement;
        selectSlot: (selection: SlotSelection) => void;
        changeEvent: (change: EventChange<E>) => void;
      }) => Content
    >
  >;
  renderToolbar?: (context: {
    date: Date;
    view: View;
    label: string;
    views: readonly View[];
    navigate: (action: "previous" | "today" | "next") => void;
    setView: (view: View) => void;
  }) => Content;
  formats?: {
    time?: (date: Date) => string;
    day?: (date: Date) => string;
    period?: (start: Date, end: Date, view: View) => string;
  };
  dayLayoutAlgorithm?:
    | "no-overlap"
    | "overlap"
    | ((segments: readonly Segment<E>[]) => PositionedSegment<E>[]);
  views?: readonly View[];
  selectable?: boolean;
  /** Enable blank-area touch dragging; false keeps native touch scrolling and tap-to-select. */
  touchSelection?: boolean;
  editable?: boolean;
  resizable?: boolean;
  selectedEventId?: string | null;
  scrollToMinute?: number;
  monthMaxEvents?: number;
  monthOverflow?: "popup" | "expand";
  messages?: Partial<Messages>;
  backgroundEvents?: readonly E[];
  now?: () => Date;
  /** DOM lifecycle hooks, used by framework adapters to manage content mounts. */
  onBeforeRender?: (context: { partial: boolean }) => void;
  onRender?: () => void;
  renderEvent?: (event: E, context: { view: View; date: DateKey }) => Content;
  renderColumnHeader?: (column: Column) => Content;
  eventStyle?: (event: E) => ElementStyle;
  columnStyle?: (column: Column) => ElementStyle;
  dayStyle?: (date: DateKey) => ElementStyle;
  onSelectSlot?: (selection: SlotSelection) => void;
  onSelecting?: (selection: SlotSelection) => boolean | void;
  onSelectEvent?: (event: E, source: MouseEvent | KeyboardEvent) => void;
  onDoubleClickEvent?: (event: E, source: MouseEvent) => void;
  onEventChange?: (change: EventChange<E>) => void;
  /** Return false to reject a move/resize. Events are always controlled by the caller. */
  canChangeEvent?: (change: EventChange<E>) => boolean;
  onNavigate?: (date: Date, view: View) => void;
  onViewChange?: (view: View) => void;
  onRangeChange?: (range: DateRange, view: View) => void;
  onDrillDown?: (date: Date, view: View) => void;
  onShowMore?: (events: readonly E[], date: DateKey) => void;
  /** Native HTML5 external drop. Return an event from application-owned drag data. */
  getExternalEvent?: (transfer: DataTransfer) => E | null;
  onExternalDrop?: (change: EventChange<E>) => void;
}
export interface CalendarHandle<E extends CalendarEvent = CalendarEvent> {
  update: (options: Partial<CalendarOptions<E>>) => void;
  /** Replace the full option set, clearing callbacks/options no longer present. */
  setOptions: (options: CalendarOptions<E>) => void;
  destroy: () => void;
  scrollToTime: (minute: number) => void;
  getOptions: () => Readonly<CalendarOptions<E>>;
}
