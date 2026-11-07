# Changelog

## 0.1.0 — Unreleased

- Add opt-in `timeGridGuides` with midnight-aligned lines, labels or boundary ticks, custom label rendering and theme tokens, including temporary overnight hours. Migration: no changes required; guides are disabled by default.

- Framework-independent TypeScript calendar core and DOM renderer.
- Day, week, work-week, month, agenda and N-day date × resource vertical views.
- Timed/all-day events, midnight segmentation, overlap layout and background events.
- Selection, dragging, resizing, auto-scroll, keyboard operations and external drops.
- IANA time zones, locale formatting, themes, RTL and rendering/style hooks.
- React and Vue adapters with framework-native custom content.
- Local examples, unit/browser tests, declarations, source maps and package validation.

- Separate view modules, pointer/keyboard controllers and lifecycle coordination.
- Indexed day boundaries, reused formatters and partial time-column updates.
- Safe data refresh during pointer gestures, with cancellation on conflicting edits.
- Continuous month bars, accessible overflow dialog, inline expansion option and configurable fixed weeks.
- Reproducible browser rendering benchmarks and regression tests for the new behavior.

- shadcn/ui playground controls and date-time editor with all-day dates, resource selection, interval validation and explicit display-zone conversion.
- Neutral light/dark styling shared by all calendar views; UI packages remain development-only dependencies.

- Downward timed resize and slot selection can continue past midnight into the following day, with temporary next-day hours and edge auto-scroll.

- Replace the native date-time popup with shadcn Calendar + Popover and direct date/time text entry.
- Poll file changes in the development server so external edits invalidate served modules.

Private development preview; no npm release has been made.

- Drag and resize previews retain the source timed event’s overlap-lane width and inline position, including RTL and cross-column moves.

- Use the official shadcn date-and-time picker composition with native time inputs and explicit start/end dates for overnight events.

- Keep the event editor compact with start/end date-and-time rows; show date calendars only in popovers.

- Use official shadcn Select and Checkbox throughout the playground; size the editor to its contents with start/end fields side by side on desktop.

- Keep the timezone and all-day corner labels aligned with the sticky time gutter while scrolling horizontally; overflowing all-day event lists scroll within their resource cells.

- Omit pointer resize handles and grab styling from Agenda rows while retaining click and keyboard activation.

- Bound native time input width across platforms, fit the editor to its content, wrap date/time on very narrow screens, constrain calendar popovers to available height and keep the demo usable in landscape.

- Pointer range selection hides the keyboard cursor. Overnight drag extensions show the following day's timed events in their resource columns until release or cancellation.
- Time-grid columns support translated keyboard instructions (`messages.timeColumnInstruction`), shared `timeGutterMarkers`, and `hideEmptyAllDayRow`. The default still shows the empty all-day row.
- Column background images now paint beneath the slot lines. The opt-in `fc-event-surface` class separates a timed card's appearance from its hit area, and grip tokens customize the visible resize handles.
- React's `renderReactToolbar` receives the calendar navigation context. `onSelectEvent` supplies a third argument with the activated segment's date and anchor. Existing two-argument handlers continue to work.
