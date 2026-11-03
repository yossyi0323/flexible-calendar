# shadcn/ui components

These components come from the official [shadcn/ui new-york-v4 registry](https://ui.shadcn.com/r/styles/new-york-v4/dialog.json), retrieved on 2026-11-03. The MIT license is retained in this directory. Imports use relative ESM paths for this repository's TypeScript configuration.

The date picker composes the registry Calendar and Popover components, following the [official date-picker composition](https://ui.shadcn.com/docs/components/radix/date-picker).

They power the playground only. Tailwind, Radix and the UI helper packages are development dependencies; the published calendar core and DOM renderer do not require them. The calendar's standalone CSS uses a matching neutral palette for both themes.

The event schedule follows the official [CalendarWithTime example](https://github.com/shadcn-ui/ui/blob/main/apps/v4/examples/base/calendar-time.tsx), using Calendar, Card, Field and InputGroup. Time inputs use `type="time"` with `step={60}` for minute precision. An optional end-date selector supports multi-day events.
