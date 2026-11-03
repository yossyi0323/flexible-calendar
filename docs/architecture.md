# Architecture

```text
Application data / persistence / editor
             ↓ events + callbacks
 React adapter      Vue adapter      plain TypeScript
       ↘                ↓                 ↙
       DOM renderer (views, pointer/keyboard lifecycle, themes)
                          ↓
         Core (civil dates, columns, segments, layout, changes)
                          ↓
              Temporal polyfill + native Intl
```

`src/core` has no DOM or framework imports. It can run on a server, in a worker, or in a custom renderer. Functions return new intervals/positions and never change event records.

`src/dom` mounts one calendar into a caller-owned host. The renderer owns navigation and scroll position, but events remain controlled. All gestures derive one proposed interval; a cancellation never changes data. Native pointer capture keeps drags attached to the original event, and cleanup cancels animation frames/timers. All-day and date headers stay visible while the time grid scrolls.

`src/react` manages the DOM instance through effects and renders custom content through portals. `src/vue` uses lifecycle hooks, reactive options and Teleport. Neither framework is imported by the root or DOM entry point.

Views are presentation over the same event model. Resources represent arbitrary parallel columns (rooms, people, Plan/Do, etc.), not dates. Date keys are separate; midnight splitting is purely visual. A caller can style each column using its real date and resource without reaching into private DOM.

`calendar.ts` owns instance lifecycle, navigation and shared context. View rendering lives in `time-view.ts`, `month-view.ts`, `agenda-view.ts` and `toolbar.ts`; `pointer.ts` and `keyboard.ts` own interaction logic. `month-popup.ts` owns dialog cleanup, and `time-update.ts` decides which columns need replacement.

Day boundaries and event segments are indexed once per render. Intl formatters are reused. Event-only time-view updates replace affected date/resource columns; headers, scroll container and unrelated columns remain mounted. Structural changes and month/agenda updates rebuild the view, restoring scroll and focus where possible. Updates during a gesture are deferred; conflicting changes cancel the gesture before applying incoming data. Framework adapters retain custom content in surviving nodes and remove detached mounts.

The renderer is not virtualized. Dense time layouts use interval partitioning; month uses weekly spanning bars with collision-free lanes. Filter fetched ranges using `onRangeChange` and measure the expected data size. [Performance measurements](performance.md) include limits and reproducible commands.

Extension points include generic event records, typed accessors, render callbacks, style callbacks, messages, view selection, per-date resources, background events, veto hooks, lifecycle hooks and the independent core. This version deliberately does not execute plugins or fetch remote data internally.
