# Flexible Calendar

A TypeScript calendar with a framework-independent engine and DOM renderer, plus React and Vue adapters. Ordinary day, week, work-week, month and agenda views sit alongside a native **date × resource vertical view**. Events always retain their real timestamps and IDs.

**Status: 0.1.0 development preview.** The API may change before 1.0. Nothing has been published to npm. `private: true` intentionally prevents accidental publication. The package name in examples is the intended package name; use the local tarball until a release exists.

![Dark vertical calendar with real dates and Plan/Do columns](docs/images/vertical-dark.png)

## Features

- Day, week, work-week, month, agenda and configurable N-day vertical views.
- Continuous multi-day month bars, 4–6 week grids and an accessible overflow popup.
- Column-level time-view updates; [reproducible performance measurements](docs/performance.md).
- Multiple resource columns per day, including different resources on different dates.
- Timed, all-day, overlapping and multi-day events; exclusive end times.
- Pointer selection, event movement, start/end resize, cross-date/resource movement, external drops and drag auto-scroll.
- Keyboard creation, movement and resizing; touch tapping/scrolling and event dragging.
- Controlled event data, validation/veto callbacks, range notifications and navigation.
- IANA time zones, configurable week starts, locale-aware formatting and translated messages.
- Light, dark, system theme, RTL, CSS variables, custom event/header rendering and style callbacks.
- Typed ESM entry points; React and Vue are optional peers, never required by the engine or DOM renderer.

See [API](docs/api.md), [feature comparison](docs/features.md), [date/time behavior](docs/dates.md), and [verification and release notes](docs/verification.md). This is an independent implementation, not a prop-compatible fork of react-big-calendar.

## Try it locally

Requires Node.js 20.19+ (or 22.12+) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The playground includes Plan/Do, meeting-room and personal-calendar examples, all views, a shadcn/ui editor with direct start/end date-time input, all-day dates, column selection, locale and light/dark theme controls. Inputs use the displayed calendar time zone and invalid intervals cannot be saved. React and Vue examples are linked below the playground. No account, database, or environment variables are required.

```sh
npm run check                    # typecheck, unit tests, ESM + declaration build
npx playwright install          # test browsers
npm run test:e2e                 # browser interactions
npm run test:package             # publint + Are the Types Wrong?
npm run format:check
npm pack                        # local installable tarball; does not publish
```

Install the resulting `.tgz` in a separate test application with `npm install /absolute/path/to/package.tgz`.

## Plain TypeScript

```ts
import { createCalendar } from "@yossyi0323/flexible-calendar/dom";
import { atMinute, type CalendarEvent } from "@yossyi0323/flexible-calendar";
import "@yossyi0323/flexible-calendar/style.css";

const timeZone = "Asia/Tokyo";
const day = "2026-11-03";
let events: CalendarEvent[] = [
  {
    id: "focus",
    title: "Focus time",
    resourceId: "plan",
    start: atMinute(day, 9 * 60, timeZone),
    end: atMinute(day, 10 * 60, timeZone),
  },
];

const calendar = createCalendar(
  document.querySelector<HTMLElement>("#calendar")!,
  {
    date: atMinute(day, 0, timeZone),
    view: "vertical",
    days: 3,
    timeZone,
    events,
    resources: [
      { id: "plan", title: "Plan" },
      { id: "do", title: "Do" },
    ],
    theme: "auto",
    scrollToMinute: 8 * 60,
    onEventChange(change) {
      events = events.map((event) => {
        if (event.id !== change.event.id) return event;
        const { resourceId: oldResource, ...rest } = event;
        return {
          ...rest,
          start: change.start,
          end: change.end,
          allDay: change.allDay,
          ...(change.resourceId === undefined
            ? {}
            : { resourceId: change.resourceId }),
        };
      });
      calendar.update({ events });
      // Persist through your own API, or keep the original array to reject the edit.
    },
    onSelectSlot(slot) {
      console.log(slot.start, slot.end, slot.resourceId);
    },
  },
);

// During application cleanup:
// calendar.destroy();
```

No virtual date, date-encoded resource ID, manual midnight splitting, or synthetic continuation ID is needed. A two-day event is supplied once. All rendered fragments point to that same original event.

## React

```tsx
import { Calendar } from "@yossyi0323/flexible-calendar/react";
import "@yossyi0323/flexible-calendar/style.css";

<Calendar
  date={date}
  view="week"
  events={events}
  timeZone="Asia/Tokyo"
  theme="auto"
  onEventChange={handleChange}
  renderReactEvent={(event) => <strong>{event.title}</strong>}
/>;
```

Use React/React DOM 18 or later. The wrapper mounts after hydration and works in StrictMode. Custom content uses portals, preserving React context. For a Next.js application, import the component in a client component and the stylesheet in the appropriate application CSS entry. See the runnable [React example](examples/react.tsx).

## Vue 3

```vue
<script setup lang="ts">
import { reactive } from "vue";
import {
  Calendar,
  type CalendarOptions,
} from "@yossyi0323/flexible-calendar/vue";
import "@yossyi0323/flexible-calendar/style.css";

const options = reactive<CalendarOptions>({
  date: new Date(),
  events: [],
  view: "month",
  theme: "auto",
});
</script>

<template>
  <Calendar :options="options">
    <template #event="{ event }"
      ><strong>{{ event.title }}</strong></template
    >
  </Calendar>
</template>
```

The Vue adapter handles reactive updates and cleanup; slots use Teleport. See the runnable [Vue example](examples/vue.ts). Svelte, Angular and other frameworks can mount `createCalendar` into a lifecycle-managed element, or build their own renderer on the headless exports.

## Independent engine

```ts
import {
  buildColumns,
  splitEvent,
  layoutSegments,
} from "@yossyi0323/flexible-calendar";

const columns = buildColumns(config);
const segments = events.flatMap((event) =>
  splitEvent(event, [columns[0]!.date], "Asia/Tokyo"),
);
const positions = layoutSegments(segments); // normalized left/width, wall-clock minutes
```

The root entry never imports React, Vue or the DOM renderer. See [architecture](docs/architecture.md) for the extension boundaries.

## Scope

This package supplies calendar UI, layout and interaction calculations. Applications own persistence, authorization, event editors, recurrence expansion and undo/redo. The examples are memory-only. No consumer application's code is modified by this repository.

MIT licensed. See [contributing](CONTRIBUTING.md) and [release procedure](docs/releasing.md).
