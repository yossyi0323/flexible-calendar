import {
  createCalendar,
  type CalendarHandle,
  type CalendarOptions,
} from "../src/dom/index.js";
import {
  atMinute,
  addDays,
  dateKey,
  type CalendarEvent,
  type EventChange,
} from "../src/core/index.js";
import "../src/dom/style.css";
import "./demo.css";
const zone = "Asia/Tokyo";
const day = "2026-11-03";
const at = (minute: number, offset = 0) =>
  atMinute(addDays(day, offset), minute, zone);
const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `<main><header class="demo-heading"><div><div class="eyebrow">FLEXIBLE CALENDAR / TYPESCRIPT</div><h1>Your time. Your structure.</h1><p>Real dates, any number of columns, every calendar view.</p></div><div class="demo-controls"><label>Example<select id="scenario"><option value="plan">Plan / Do</option><option value="rooms">Meeting rooms</option><option value="plain">Personal calendar</option></select></label><label>Theme<select id="theme"><option value="auto">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Locale<select id="locale"><option value="en-US">English</option><option value="ja-JP">日本語</option></select></label></div></header><div id="calendar"></div><footer><span class="status-dot"></span><span id="status" role="status">Drag an empty area to create an event. Drag events across dates and columns.</span><button id="reset">Reset demo</button></footer><details><summary>Keyboard & integration examples</summary><p>Tab to a column. ↑ ↓ choose a time; Enter creates. On an event, Alt + arrows moves; Alt + Shift + ↑ ↓ resizes. Escape cancels a drag.</p><nav><a href="/examples/react.html">React example</a><a href="/examples/vue.html">Vue example</a></nav><p>The demo stores changes in memory. Reload to reset.</p></details></main><dialog id="editor"><form method="dialog"><h2 id="editor-heading">Event</h2><label>Title<input id="event-title" required maxlength="160" autocomplete="off"></label><div class="dialog-actions"><button value="cancel" formnovalidate>Cancel</button><button id="delete" value="delete" formnovalidate>Delete</button><button id="save" value="save">Save</button></div></form></dialog>`;
let events: CalendarEvent[] = [];
let instance: CalendarHandle;
let scenario = "plan";
let editing: CalendarEvent | undefined;
const status = (text: string) => {
  document.querySelector("#status")!.textContent = text;
};
function seed(): CalendarEvent[] {
  const resources =
    scenario === "plain"
      ? []
      : scenario === "rooms"
        ? ["cedar", "maple"]
        : ["plan", "do"];
  const resource = (index: number) =>
    resources.length ? { resourceId: resources[index % 2]! } : {};
  return [
    {
      id: "1",
      title:
        scenario === "rooms" ? "Product review" : "Design the next chapter",
      start: at(9 * 60),
      end: at(10 * 60 + 30),
      ...resource(0),
      color: "#1c6f80",
    },
    {
      id: "2",
      title: scenario === "rooms" ? "Engineering sync" : "Deep work",
      start: at(9 * 60 + 15),
      end: at(10 * 60 + 15),
      ...resource(1),
      color: "#6f53a6",
    },
    {
      id: "3",
      title: "Research & notes",
      start: at(10 * 60),
      end: at(11 * 60),
      ...resource(0),
      color: "#88601e",
    },
    {
      id: "4",
      title: "Lunch with the team",
      start: at(12 * 60),
      end: at(13 * 60),
      ...resource(0),
      color: "#4b6d31",
    },
    {
      id: "5",
      title: "Across midnight",
      start: at(23 * 60),
      end: at(60, 1),
      ...resource(0),
      color: "#6f53a6",
    },
    {
      id: "6",
      title: "Release day",
      start: at(0, 1),
      end: at(0, 2),
      ...resource(1),
      allDay: true,
      color: "#9f3d57",
    },
    {
      id: "7",
      title: "Make room to think",
      start: at(14 * 60, 1),
      end: at(16 * 60, 1),
      ...resource(0),
    },
    {
      id: "8",
      title: "A fresh perspective",
      start: at(10 * 60, 2),
      end: at(11 * 60, 2),
      ...resource(1),
    },
  ];
}
function resources() {
  return scenario === "plain"
    ? []
    : scenario === "rooms"
      ? [
          { id: "cedar", title: "Cedar · 6 seats" },
          { id: "maple", title: "Maple · 12 seats" },
        ]
      : [
          { id: "plan", title: "PLAN" },
          { id: "do", title: "DO" },
        ];
}
const dialog = document.querySelector<HTMLDialogElement>("#editor")!;
function edit(event: CalendarEvent) {
  editing = event;
  document.querySelector<HTMLInputElement>("#event-title")!.value = event.title;
  dialog.showModal();
}
dialog.addEventListener("close", () => {
  if (!editing || dialog.returnValue === "cancel" || !dialog.returnValue)
    return;
  if (dialog.returnValue === "delete")
    events = events.filter((e) => e.id !== editing!.id);
  else {
    const updated = {
      ...editing,
      title: document.querySelector<HTMLInputElement>("#event-title")!.value,
    };
    events = [...events.filter((e) => e.id !== updated.id), updated];
  }
  instance.update({ events });
  status(`${events.length} events · changes saved in memory`);
  editing = undefined;
});
function change(change: EventChange) {
  events = events.map((event) => {
    if (event.id !== change.event.id) return event;
    const { resourceId: _, ...rest } = event;
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
  instance.update({ events });
  status(
    `${change.event.title} → ${dateKey(change.start, zone)} ${change.resourceId ?? ""}`,
  );
}
const options: CalendarOptions = {
  date: at(0),
  events: [],
  view: "vertical",
  days: 3,
  timeZone: zone,
  resources: resources(),
  height: "min(760px, calc(100dvh - 240px))",
  scrollToMinute: 8 * 60,
  theme: "auto",
  now: () => at(10 * 60 + 40),
  onEventChange: change,
  onSelectEvent: (event) => edit(event),
  onSelectSlot: (slot) =>
    edit({
      id: crypto.randomUUID(),
      title: "",
      start: slot.start,
      end: slot.end,
      allDay: slot.allDay,
      ...(slot.resourceId === undefined ? {} : { resourceId: slot.resourceId }),
    }),
};
events = seed();
instance = createCalendar(document.querySelector("#calendar")!, {
  ...options,
  events,
});
document.querySelector("#scenario")!.addEventListener("change", (e) => {
  scenario = (e.target as HTMLSelectElement).value;
  events = seed();
  instance.update({ events, resources: resources() });
});
document.querySelector("#theme")!.addEventListener("change", (e) => {
  const theme = (e.target as HTMLSelectElement).value as
    "auto" | "dark" | "light";
  document.documentElement.dataset.theme = theme;
  instance.update({ theme });
});
document.querySelector("#locale")!.addEventListener("change", (e) => {
  const locale = (e.target as HTMLSelectElement).value;
  instance.update({
    locale,
    messages:
      locale === "ja-JP"
        ? {
            today: "今日",
            day: "日",
            week: "週",
            "work-week": "平日",
            month: "月",
            agenda: "予定一覧",
            vertical: "バーティカル",
            allDay: "終日",
            noEvents: "予定はありません",
            more: (n) => `他${n}件`,
          }
        : {},
  });
});
document.querySelector("#reset")!.addEventListener("click", () => {
  events = seed();
  instance.update({ events, date: at(0) });
  status("Demo reset");
});
// A typed public demo handle is useful for automation and embedding experiments.
Object.assign(window, { demoCalendar: instance });
