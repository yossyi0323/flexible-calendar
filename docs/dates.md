# Date and time contract

The data model contains actual `Date` instants. Layout uses wall-clock minutes within civil dates in one chosen IANA zone. Date arithmetic uses `@js-temporal/polyfill`; formatting uses `Intl.DateTimeFormat`. No moment/date-fns global settings are required.

- ISO date keys use `YYYY-MM-DD`.
- A calendar day is midnight to the next civil midnight, never an assumed 86,400,000ms.
- Event ends are exclusive. An event ending at midnight does not occupy the following day.
- All-day events should begin/end at civil midnight in the display zone. A one-day all-day event ends at the following midnight; the renderer does not infer all-day status from duration.
- Timed moves preserve elapsed duration. All-day moves preserve civil-day duration, including across 23/25-hour DST days. Month moves preserve local start/end wall times by shifting civil dates.
- Spring-forward gaps resolve forward; ambiguous fall-back wall times choose the earlier instant (Temporal `compatible` policy). Existing timestamps preserve their actual instant.
- The time grid has a fixed 0–1440 minute civil-day axis. It does not duplicate the fall-back hour or remove spring-gap rows. A fragment whose wall-clock end is not after its start during a fold is rendered with at least one step of visual height. Use a custom renderer built on the headless API if an elapsed-time axis or duplicate-hour UI is required.
- Pointer movement is snapped to configured steps; the grabbed offset within an event is retained. Non-step-aligned start times stay offset from snapped pointer positions.
- `minMinute`/`maxMinute` clip rendering, not input data or event duration. Clipped events retain their full original timestamps in callbacks.
- Resizes preserve positive duration and clamp to at least one interaction step for timed events. Headless `resizeEvent` defaults to one minute.

`splitEvent(event, dates, zone)` returns one segment per intersecting visible date, all sharing the same `event` reference. `layoutSegments` operates on a single date/resource column; group segments before calling it. Its interval partitioning puts touching endpoints in independent overlap clusters and gives each cluster equal-width lanes.

Zero-duration markers, recurrence expansion, non-Gregorian calendar arithmetic, leap-second display and historical sub-minute wall-clock precision are not part of this version. Recurring occurrences can be supplied as ordinary events with stable occurrence IDs.
