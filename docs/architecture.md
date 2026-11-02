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

The initial renderer favors transparent, deterministic behavior over virtualization. Updating options redraws the current view, retains scroll position per view, and restores event/column focus where possible. Dense time layouts use interval partitioning; monthly/agenda event scans are per visible date. Benchmark the expected data size before using tens of thousands of events; filter the fetched range in `onRangeChange`. No performance guarantee is made for unbounded event sets.

Extension points include generic event records, typed accessors, render callbacks, style callbacks, messages, view selection, per-date resources, background events, veto hooks, lifecycle hooks and the independent core. This version deliberately does not execute plugins or fetch remote data internally.
