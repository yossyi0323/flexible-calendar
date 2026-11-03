# Feature comparison

This project targets the functional categories of [react-big-calendar](https://github.com/bigcalendar/react-big-calendar), while keeping the engine and renderer independent of React. It does **not** promise compatible props, DOM classes, identical geometry, or complete API parity. The following describes the implemented version, not a roadmap presented as finished work.

| Capability                              | Flexible Calendar 0.1                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Day / week / work-week / month / agenda | Implemented                                                                              |
| Arbitrary N-day vertical                | Implemented with real dates                                                              |
| Resource columns                        | Implemented in time views; per-date resource sets and multi-resource events supported    |
| Timed and all-day events                | Implemented; all-day status is explicit                                                  |
| Midnight-spanning events                | Automatic visual segments, original event identity retained                              |
| Overlap layout                          | No-overlap lanes by default; overlap mode and custom layout callback                     |
| Month overflow                          | Continuous weekly bars, overflow popup, optional inline expansion, `onShowMore` override |
| Date drill-down and navigation          | Implemented; toolbar can be hidden or replaced                                           |
| Custom views                            | Registered range/navigation definitions and DOM renderer callbacks                       |
| Selection, event click, double-click    | Implemented; selection veto supported                                                    |
| Pointer move and resize                 | Implemented in time/month/all-day views                                                  |
| Cross-date and cross-resource drag      | Implemented; timed duration preserved                                                    |
| External drag source                    | Native HTML5 `DataTransfer` adapter                                                      |
| Drag auto-scroll                        | Both axes in the calendar scroll container                                               |
| Keyboard / touch                        | Implemented; see interaction contract in API docs                                        |
| Background events                       | Implemented in time views, excluded from overlap calculations                            |
| Data accessors                          | Typed `adaptEvents` / `adaptResources` helpers                                           |
| Custom event/header components          | DOM nodes, React portals, Vue slots                                                      |
| Event/column/day styles                 | Public callbacks; no private DOM query needed                                            |
| Messages, locale, formats, time zone    | Intl + Temporal; custom time/day/period formatters                                       |
| RTL and dark mode                       | Included for every built-in view                                                         |
| SSR imports                             | Safe; actual UI mounts on the client                                                     |

## Deliberate differences and current limits

- This is a new API. Import replacement alone cannot convert a react-big-calendar consumer. `work-week` is spelled with a hyphen; events have required unique string IDs; notifications use native events and actual Date instants.
- Time-view all-day multi-day events remain daily fragments. Month events use continuous bars, split only at week boundaries; both retain original event identity.
- Month uses 4–6 weeks by default, with an optional fixed six-week grid. Overflow opens an accessible dialog; inline expansion and application overrides are available.
- Custom views register pure date-range/navigation functions and a renderer callback, rather than React component statics. Event creation and change callbacks are provided to the renderer.
- No Moment/Globalize/date-fns localizer adapters. Intl locale, explicit week start, time zone and formatter callbacks replace them.
- No recurrence expansion, editor form, persistence, scheduler timeline, event virtualization or built-in undo history. These are application concerns or separate extensions.
- DST uses a fixed wall-clock grid, not a duplicated fall-back hour; see [date behavior](dates.md).
- Event-only time-view updates replace affected columns. Structural changes and month/agenda updates rebuild the view. See [benchmarks](performance.md); no unbounded-data performance guarantee or formal screen-reader certification is claimed.

These differences are part of the preview review checklist. They must not be described as complete drop-in equivalence to an established library.
