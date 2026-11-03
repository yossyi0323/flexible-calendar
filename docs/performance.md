# Rendering measurements

Measured on 2026-11-03, Apple M5 / macOS arm64, Playwright Chromium 156.0.8078.4, without CPU throttling. These are local observations, not a supported event-count limit or latency guarantee.

The reproducible script mounts seven days with three resources and 100, 500 or 2,000 events, then updates one event title while preserving other event references. It forces layout after both operations. Each number is the median of three trials after one warm-up. The duration includes synchronous rendering/layout, but not subsequent paint, framework reconciliation, network requests or application work. Only seven dates contain events in the month fixture.

| View     | Events | Initial mount before → after (ms) | One-event update before → after (ms) |
| -------- | -----: | --------------------------------: | -----------------------------------: |
| Vertical |    100 |                        23.0 → 5.2 |                           22.7 → 2.7 |
| Vertical |    500 |                      104.5 → 19.1 |                           97.3 → 8.2 |
| Vertical |  2,000 |                      352.1 → 68.3 |                         345.0 → 27.9 |
| Month    |    100 |                         6.1 → 5.4 |                            6.1 → 5.0 |
| Month    |    500 |                        6.6 → 10.2 |                            6.5 → 9.1 |
| Month    |  2,000 |                       11.6 → 28.1 |                          11.4 → 27.6 |

Raw reports identify the measured commits: [baseline](../benchmarks/baseline.json) (`ef5732a`) and [after changes](../benchmarks/optimized.json) (`1989f8d`). The baseline script was added in the following commit and run against the original implementation. Later input-order handling does not appear in this measurement.

The vertical renderer reuses day boundaries and Intl formatters and replaces only affected columns. Its 2,000-event fixture still contains 12,156 DOM nodes: this is not virtualization. Update cost also includes validation, indexing and layout; it is not constant time.

The month renderer now computes collision-free weekly spanning bars and supports an overflow dialog, whereas the baseline rendered independent daily fragments. It is slower at 500 and 2,000 events, despite rendering only the first three lanes. Month updates still rebuild the view. The table deliberately includes this regression rather than claiming that all views became faster.

## Reproduce

After installing development dependencies and the Playwright Chromium browser:

```sh
npm run bench -- benchmarks/latest.json
```

If browsers are installed outside Playwright's default cache, set `PLAYWRIGHT_BROWSERS_PATH` to that directory. The script starts a local Vite server on port 4174, launches a fresh browser and closes both when done. Reports are written to the supplied path. Compare runs on the same machine/browser with other workloads idle.

Changing every record reference, using custom renderers, dense overlapping clusters, wide resource grids or slow devices can produce different results. Fetch only the visible range via `onRangeChange`; measure the consumer application's expected data and hardware. Physical mobile performance and sustained memory profiles remain unmeasured.
