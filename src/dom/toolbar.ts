import {
  addDays,
  atMinute,
  navigateCalendar,
  type BuiltInView,
  type CalendarEvent,
  type View,
} from "../core/index.js";
import { button, element, setContent } from "./helpers.js";
import type { CalendarContext } from "./context.js";
const DEFAULT_VIEWS: readonly View[] = [
  "day",
  "week",
  "work-week",
  "month",
  "agenda",
  "vertical",
];
export function toolbar<E extends CalendarEvent>(ctx: CalendarContext<E>) {
  const {
    options,
    doc,
    root,
    tz,
    view,
    messages,
    fmt,
    dayLabel,
    dates,
    setDate,
    setView,
  } = ctx;
  const bar = element(doc, "div", "fc-toolbar");
  const navigation = element(doc, "div", "fc-navigation");
  navigation.append(
    button(doc, "‹", () => setDate(navigateCalendar(options, -1))),
  );
  navigation.lastElementChild!.setAttribute("aria-label", messages().previous);
  navigation.append(
    button(doc, messages().today, () => setDate(options.now?.() ?? new Date())),
  );
  navigation.append(
    button(doc, "›", () => setDate(navigateCalendar(options, 1))),
  );
  navigation.lastElementChild!.setAttribute("aria-label", messages().next);
  const range = dates();
  const label =
    options.formats?.period?.(
      atMinute(range[0]!, 0, tz()),
      atMinute(addDays(range.at(-1)!, 1), 0, tz()),
      view(),
    ) ??
    (view() === "month"
      ? fmt(options.date, { month: "long", year: "numeric" })
      : `${dayLabel(range[0]!)}${range.length > 1 ? ` — ${dayLabel(range.at(-1)!)}` : ""}`);
  if (options.renderToolbar) {
    setContent(
      bar,
      options.renderToolbar({
        date: options.date,
        view: view(),
        label,
        views: options.views ?? [
          ...DEFAULT_VIEWS,
          ...Object.keys(options.customViews ?? {}),
        ],
        navigate: (action) =>
          setDate(
            action === "today"
              ? (options.now?.() ?? new Date())
              : navigateCalendar(options, action === "previous" ? -1 : 1),
          ),
        setView,
      }),
    );
    root.append(bar);
    return;
  }
  const title = element(doc, "h2", "fc-period", label);
  const tabs = element(doc, "div", "fc-views");
  tabs.setAttribute("aria-label", "Calendar view");
  for (const value of options.views ?? [
    ...DEFAULT_VIEWS,
    ...Object.keys(options.customViews ?? {}),
  ]) {
    const tab = button(
      doc,
      options.customViews?.[value]?.label ?? messages()[value as BuiltInView],
      () => setView(value),
    );
    tab.setAttribute("aria-pressed", String(value === view()));
    tabs.append(tab);
  }
  bar.append(navigation, title, tabs);
  root.append(bar);
}
