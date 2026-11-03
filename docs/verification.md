# Verification — 2026-11-03

This records checks performed on the 0.1.0 implementation after the review improvements. It is evidence for the preview, not a claim that a new library has the production history of an established calendar.

## Automated results

| Check                                           | Result                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript, including examples and tests | Passed                                                                                                                                |
| Unit suite                                      | 41 passed                                                                                                                             |
| Playwright suite                                | 181 passed                                                                                                                            |
| Desktop browser engines                         | Chromium, Firefox, WebKit                                                                                                             |
| Mobile emulation                                | Pixel 7 / Chromium and iPhone 13 / WebKit                                                                                             |
| axe WCAG 2 A/AA and 2.1 A/AA rules              | No automatic violations in sampled vertical, month and agenda views, in light and dark themes, on all three desktop engines           |
| ESM + declarations + maps build                 | Passed                                                                                                                                |
| publint                                         | Passed                                                                                                                                |
| Are the Types Wrong?                            | All four JavaScript entry points passed Node ESM and bundler resolution; CSS asset excluded, CommonJS/legacy resolution not supported |
| Clean tarball install                           | Passed without React or Vue installed for core/DOM imports                                                                            |
| Consumer TypeScript check                       | Passed with React 18 types and Vue 3.3.13                                                                                             |
| Framework server imports/render                 | React 18 and Vue 3.3.13 SSR smoke passed                                                                                              |
| UI framework integration                        | React 19 StrictMode and Vue 3.5 tested in real browser engines                                                                        |

The package test builds and installs an actual tarball into a temporary clean project. It checks CSS availability, framework independence, declarations against supported older framework versions and SSR imports; it does not merely import source files from this repository.

## Interaction flow verified

The demonstrated flow is **user gesture → selection/change callback → application-owned event array update → renderer update**. No persistence request is issued by the library.

Coverage includes all six built-in views, navigation/drill-down, empty-slot creation, click-to-edit, movement across dates/resources, start/end interval calculations, pointer end resize, all-day movement, month timed-event movement, cancellation, vetoes, read-only mode, keyboard changes, focus restoration, automatic scroll, external drop, multi-resource events, custom views, React portals/Vue slots after navigation, invalid updates, unmount cleanup, and untrusted titles rendered as text.

The native vertical-view regression checks explicitly drag a midnight continuation fragment and verify that the **original event** moves with its real start/end and unchanged ID. Keyboard movement of a continuation across resource columns is covered separately. Unit tests cover exclusive midnight ends, overlap clusters, 1,000-event layout, leap/year boundaries, spring gaps/fall folds, and civil all-day duration during DST transitions.

Additional regressions cover continuous month bars and exclusive ends, 4–6 week ranges, popup keyboard dismissal/focus return/activation/cleanup, optional inline expansion, deferred refresh during a drag, conflicting updates, preserved columns/scroll/header, current callback dispatch, input-order changes, and resource moves/deletion across fragments.

[Browser benchmarks](performance.md) measure 100, 500 and 2,000 events on the same machine before and after the changes.

The playground editor uses shadcn Calendar + Popover with text time input (no browser-native date/time popup). It is tested for calendar date selection, popup Escape/focus restoration, light/dark accessibility, typed minute-level times, overnight dates, invalid intervals, cancellation/focus return, inclusive all-day end dates and light/dark accessibility. Browser time zone is set to America/New_York while the calendar uses Asia/Tokyo to verify that input does not depend on the device zone.

Pointer regressions also cover downward end-resize from 23:30 through midnight to 01:00 and 02:00, overnight slot creation, edge auto-scroll and Escape restoration of the original interval and axis.

## Visual review

The saved images were captured from the functioning playground; they are not mockups. Light and dark vertical views, dark month and the shadcn/ui date-time editor were inspected for clipping, legibility, headers and event placement.

- [Dark vertical](images/vertical-dark.png)
- [Light vertical](images/vertical-light.png)
- [Dark month](images/month-dark.png)
- [Date-time editor, dark](images/editor-dark.png)
- [Date-time editor, light](images/editor-light.png)
- [shadcn date picker](images/date-picker-dark.png)

## Remaining review boundaries

- Physical iPhone/Android hardware and manual screen-reader testing have not been performed. Automated accessibility scans are not a WCAG certification.
- No existing application's authentication, API, database or production data was involved. No consumer application was migrated.
- Recurrence, persistence, consumer-specific editors and optimistic updates belong to the consumer and are not certified by these tests. The included playground editor is an in-memory example.
- The renderer is not virtualized; the test of 1,000 layout intervals is not a throughput or browser memory guarantee for arbitrarily large schedules.
- [Feature differences](features.md) and [DST behavior](dates.md) are explicit preview constraints. Time-view all-day events remain daily fragments, and the time axis does not duplicate DST fall-back hours.
- Repository visibility remains private and `private: true` blocks npm publication. Publication requires the owner's separate review.

CI repeats formatting, type/unit/build checks, package-consumer validation and the browser suite. Local browser binaries used for this run were temporary test dependencies; no user browser profile or global Mac configuration was modified.
