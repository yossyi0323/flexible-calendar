# API

All entry points ship strict TypeScript declarations. ESM only; use an ESM-aware bundler or Node ESM. The generated declaration files are authoritative for complete signatures.

## Entry points

| Import                          | Exports                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@yossyi0323/flexible-calendar` | Event/config types, civil-date operations, column building, event splitting, overlap layout, move/resize calculations, schema adapters |
| `…/dom`                         | `createCalendar`, DOM options and handle types, `englishMessages`                                                                      |
| `…/react`                       | Generic `Calendar<E>`, `CalendarProps`, shared option/event types                                                                      |
| `…/vue`                         | Vue `Calendar`, shared option/event types                                                                                              |
| `…/style.css`                   | Scoped styles and all three theme modes                                                                                                |

## Data

```ts
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string | readonly string[];
  allDay?: boolean;
  color?: string;
  editable?: boolean;
}
interface Resource {
  id: string;
  title: string;
  color?: string;
}
```

Event IDs must be unique in the supplied array, including across resources. Add your own fields by extending `CalendarEvent`; callbacks and renderers preserve the original typed object. If several external calendars can have the same ID, use a composite UI ID and retain the external ID in another field. No ID is synthesized during day splitting.

The end is **exclusive**, including for all-day events. Events with invalid dates or `end <= start` throw `RangeError`. Use explicit offset-bearing timestamps for instants and `atMinute(dateKey, minute, zone)` for calendar wall times.

`adaptEvents(records, accessors)` accepts typed property names or accessor functions and returns events with the original object in `source`. `adaptResources` does the same for resource records. This lets an application preserve its own schema without runtime field-name guessing.

## Core configuration

| Option                   | Default     | Meaning                                                   |
| ------------------------ | ----------- | --------------------------------------------------------- |
| `events`                 | required    | Read-only array of events; the library never mutates it   |
| `date`                   | required    | Anchor date in the display time zone                      |
| `view`                   | `week`      | `day`, `week`, `work-week`, `month`, `agenda`, `vertical` |
| `days`                   | `3`         | Number of dates in vertical/agenda views (1–366)          |
| `weekStartsOn`           | `1`         | 0 = Sunday through 6 = Saturday                           |
| `timeZone`               | host zone   | IANA display time zone                                    |
| `locale`                 | `en-US`     | Locale for Intl formatting                                |
| `resources`              | none        | Columns repeated for every date in time views             |
| `resourcesForDate`       | none        | Override resources for each ISO date key                  |
| `minMinute`, `maxMinute` | `0`, `1440` | Visible wall-clock bounds                                 |
| `step`                   | `30`        | Selection, keyboard and pointer snap increment in minutes |

Month always displays six weeks; work-week excludes Saturday/Sunday after applying the chosen week start. `vertical` starts exactly on the anchor date. Week and work-week start at the enclosing week's boundary. Agenda lists the anchor date and following `days - 1` dates.

When resources are present, time views show events whose resource ID matches the column. Without resources, all events appear regardless of their resource assignment. Month and agenda show all supplied events. A resource ID array displays one input event in multiple columns; month and agenda still list it once per intersecting date. A drag to another column proposes that target as the new assignment; use the original event in the callback if your application needs a different reassignment rule. Resource IDs are independent from dates; empty per-date resources produce a single ungrouped column for that date.

## DOM options

- **Geometry:** `height` (680px), `hourHeight` (64px), `columnWidth` (minimum 160px), `scrollToMinute`, `monthMaxEvents` (3).
- **Appearance:** `theme: 'light' | 'dark' | 'auto'`, `direction: 'ltr' | 'rtl'`, `messages`, `selectedEventId`, `backgroundEvents`, `now`.
- **Formatting:** `formats.time(date)`, `formats.day(date)`, `formats.period(start, exclusiveEnd, view)` override default Intl labels.
- **Layout:** `dayLayoutAlgorithm` accepts `no-overlap` (default), `overlap`, or a function from clipped segments to normalized positions.
- **Controls:** `toolbar` (true), `renderToolbar(context)`, `views` (all built-in views), `selectable` (true), `editable` (true), `resizable` (true), `touchSelection` (false).
- **Rendering:** `renderEvent(event, { view, date })`, `renderColumnHeader(column)` return text or a caller-created DOM node. Text is never interpreted as HTML. Nodes are trusted application content; do not interpolate untrusted HTML.
- **Styling:** `eventStyle(event)`, `columnStyle(column)`, `dayStyle(dateKey)` return `{ className?, style? }`. Column styling can supply a date-specific gradient without querying private DOM structure.
- **Lifecycle:** `onBeforeRender`, `onRender` let integrations clean up and attach custom content. Do not synchronously update calendar options from these hooks; that would trigger recursive rendering.

Custom content sits inside event buttons; avoid nested buttons/links/form controls. `renderReactEvent` and `renderReactColumnHeader` accept React nodes and preserve context. Vue exposes `event` and `columnHeader` slots. DOM render callbacks remain available in both wrappers.

## Callbacks

`onSelectSlot(selection)` receives `{ start, end, resourceId?, allDay, action, box? }`. `action` is `click`, `select` or `keyboard`; pointer selections include viewport `box.clientX/clientY` (also `x/y`). Selection belongs to the resource where the gesture started, even when it spans dates. `onSelecting(selection)` may return false to veto selection and marks the drag preview as invalid.

`onSelectEvent(event, nativeEvent)` and `onDoubleClickEvent` notify activation. Event objects are the original objects even when clicked on a continuation fragment. The native event is not a React SyntheticEvent.

`onEventChange(change)` receives `{ event, start, end, resourceId?, allDay, action }`. Actions are `move`, `resize-start`, `resize-end`. Both bounds are real instants. The library only proposes a change; call `update({ events })` or update framework state to accept it. When changing to an ungrouped column, an absent `resourceId` means to remove the prior resource ID. `canChangeEvent(change)` may return false to reject it before notification.

For asynchronous saves, keep the old array until success, or apply an optimistic array and restore it on failure. Backend failures cannot cause hidden internal state divergence because there is no internal event store.

`onNavigate(date, view)`, `onViewChange(view)`, `onRangeChange({start,end}, view)` notify navigation. Range end is exclusive. The range callback fires initially and when view, zone or range changes. The DOM instance manages its current date/view until overridden with `update`; wrappers reapply explicitly supplied props/options. Keep date/view in application state and handle callbacks if the application controls navigation.

`onDrillDown(date, 'day')` overrides the default date-header transition to day view. `onShowMore(events, dateKey)` overrides in-cell expansion. `getExternalEvent(dataTransfer)` and `onExternalDrop(change)` support native HTML5 drag sources; applications own payload validation and insertion.

## Instance

```ts
const handle = createCalendar(host, options);
handle.update({ events }); // shallow merge partial options
handle.setOptions(nextOptions); // full replacement, clears omitted optional settings
handle.scrollToTime(9 * 60);
handle.getOptions(); // shallow snapshot; event records remain caller-owned
handle.destroy(); // idempotent, cancels timers and gestures, removes own root
```

Use an empty host element owned by your component. Multiple calendars on the page are independent. Update after destroy throws. The root engine and module imports are SSR-safe; actual DOM mounting requires a document. React and Vue mount during their client lifecycle and destroy during unmount.

## Keyboard and touch

- Tab focuses controls, events, all-day cells, month days and time columns.
- Focus a time column: Up/Down changes time by `step`, Home/End chooses visible bounds, Left/Right changes column, Enter/Space selects a slot.
- Focus an event: Enter/Space activates; Alt+Up/Down moves by a step, Alt+Left/Right moves to an adjacent column/day; Alt+Shift+Up/Down resizes the end. `editable: false` or event-level `editable: false` disables changes.
- Escape cancels a pointer gesture. Pointer cancellation/window blur also aborts without emitting a change.
- Touch defaults to native empty-area panning and tap selection; events can be dragged. Set `touchSelection: true` for empty-area range dragging, at the cost of native panning in the grid. Use the gutter or scrollbar to scroll in that mode.

## CSS contract

The public theme tokens are `--fc-bg`, `--fc-surface`, `--fc-text`, `--fc-muted`, `--fc-border`, `--fc-accent`, `--fc-today`, `--fc-event-color`, `--fc-event-text`, and `--fc-now`. Set these on `.fc-calendar` or a more specific selector. The stylesheet is entirely `.fc-` scoped. Structural class names are currently an implementation detail; use renderer/style callbacks for application extensions.

## Custom views

Register a pure range/navigation definition in `customViews` and its DOM rendering function in `customViewRenderers`, then set `view` to that key. Custom names appear in the default toolbar; `views` can restrict the offered list.

```ts
customViews: {
  summary: {
    label: 'Summary',
    dates: (date, zone) => [dateKey(date, zone)],
    navigate: (date, direction, zone) => shiftDate(date, direction, zone),
  },
},
customViewRenderers: {
  summary: ({ document, dates, events, renderEvent }) => {
    const list = document.createElement('div');
    for (const event of events) list.append(renderEvent(event, dates[0]!));
    return list;
  },
},
```

The renderer also receives `selectSlot` and `changeEvent` functions that run the standard validation/veto callbacks. It owns its custom layout, keyboard and pointer behavior. `renderEvent` creates a normal accessible event button with standard activation behavior. Custom range functions must return 1–366 unique, ascending ISO date keys; invalid ranges fail validation. Import `dateKey` and `shiftDate` from the root entry.
