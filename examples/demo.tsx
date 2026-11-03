import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, RotateCcw } from "lucide-react";
import { createCalendar, type CalendarHandle } from "../src/dom/index.js";
import { dateKey, type CalendarEvent } from "../src/core/index.js";
import { Button } from "./ui/button.js";
import { Label } from "./ui/label.js";
import { NativeSelect, NativeSelectOption } from "./ui/native-select.js";
import { EventEditor } from "./event-editor.js";
import { at, zone, seed, resources } from "./demo-data.js";
import "./demo.css";
import "../src/dom/style.css";

function App() {
  const host = useRef<HTMLDivElement>(null);
  const calendar = useRef<CalendarHandle | null>(null);
  const [initialEvents] = useState(() => seed("plan"));
  const events = useRef(initialEvents);
  const focusReturn = useRef<HTMLElement | null>(null);
  const [scenario, setScenario] = useState("plan");
  const [theme, setTheme] = useState<"auto" | "light" | "dark">("auto");
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [status, setStatus] = useState(
    "Drag to create. Click an event to edit its dates and times.",
  );
  function edit(event: CalendarEvent, source?: MouseEvent | KeyboardEvent) {
    focusReturn.current =
      source?.currentTarget instanceof HTMLElement
        ? source.currentTarget
        : (document.activeElement as HTMLElement);
    setEditing(event);
  }
  useEffect(() => {
    const instance = createCalendar(host.current!, {
      date: at(0),
      events: events.current,
      view: "vertical",
      days: 3,
      timeZone: zone,
      resources: resources("plan"),
      height: "min(760px, calc(100dvh - 230px))",
      scrollToMinute: 480,
      theme: "auto",
      now: () => at(640),
      onSelectEvent: edit,
      onSelectSlot: (slot) =>
        edit({
          id: crypto.randomUUID(),
          title: "",
          start: slot.start,
          end: slot.end,
          allDay: slot.allDay,
          ...(slot.resourceId === undefined
            ? {}
            : { resourceId: slot.resourceId }),
        }),
      onEventChange: (change) => {
        events.current = events.current.map((event) => {
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
        instance.update({ events: events.current });
        setStatus(
          `${change.event.title} → ${dateKey(change.start, zone)} ${change.resourceId ?? ""}`,
        );
      },
    });
    calendar.current = instance;
    Object.assign(window, { demoCalendar: instance });
    return () => {
      instance.destroy();
      calendar.current = null;
    };
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "auto" && media.matches),
      );
    };
    apply();
    media.addEventListener("change", apply);
    calendar.current?.update({ theme });
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  function save(event: CalendarEvent) {
    events.current = [
      ...events.current.filter((e) => e.id !== event.id),
      event,
    ];
    calendar.current?.update({ events: events.current });
    setStatus(`${events.current.length} events · changes saved in memory`);
    setEditing(null);
  }
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="size-4" />
            Flexible Calendar
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Calendar playground
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your dates, your columns. Create, move and edit events.
          </p>
        </div>
        <div className="grid w-full grid-cols-[1.4fr_1fr_1fr] gap-3 sm:flex sm:w-auto">
          <div className="grid gap-2">
            <Label htmlFor="scenario">Example</Label>
            <NativeSelect
              id="scenario"
              value={scenario}
              onChange={(e) => {
                const value = e.target.value;
                setScenario(value);
                events.current = seed(value);
                calendar.current?.update({
                  events: events.current,
                  resources: resources(value),
                });
              }}
            >
              <NativeSelectOption value="plan">Plan / Do</NativeSelectOption>
              <NativeSelectOption value="rooms">
                Meeting rooms
              </NativeSelectOption>
              <NativeSelectOption value="plain">
                Personal calendar
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme">Theme</Label>
            <NativeSelect
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
            >
              <NativeSelectOption value="auto">System</NativeSelectOption>
              <NativeSelectOption value="light">Light</NativeSelectOption>
              <NativeSelectOption value="dark">Dark</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="locale">Locale</Label>
            <NativeSelect
              id="locale"
              defaultValue="en-US"
              onChange={(e) => {
                const locale = e.target.value;
                calendar.current?.update({
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
                          close: "閉じる",
                        }
                      : {},
                });
              }}
            >
              <NativeSelectOption value="en-US">English</NativeSelectOption>
              <NativeSelectOption value="ja-JP">日本語</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </header>
      <div id="calendar" ref={host} />
      <footer className="mt-4 flex items-center justify-between gap-4">
        <span
          id="status"
          role="status"
          className="text-xs text-muted-foreground"
        >
          {status}
        </span>
        <Button
          id="reset"
          variant="outline"
          size="sm"
          onClick={() => {
            events.current = seed(scenario);
            calendar.current?.update({ events: events.current, date: at(0) });
            setStatus("Demo reset");
          }}
        >
          <RotateCcw />
          Reset demo
        </Button>
      </footer>
      <details className="mt-5 text-xs text-muted-foreground">
        <summary className="cursor-pointer">
          Keyboard & integration examples
        </summary>
        <p className="mt-3">
          Tab to a column. ↑ ↓ choose a time; Enter creates. On an event, Alt +
          arrows moves; Alt + Shift + ↑ ↓ resizes. Escape cancels.
        </p>
        <nav className="mt-3 flex gap-4">
          <a
            className="underline underline-offset-4"
            href="/examples/react.html"
          >
            React example
          </a>
          <a className="underline underline-offset-4" href="/examples/vue.html">
            Vue example
          </a>
        </nav>
        <p className="mt-3">Changes are kept in memory. Reload to reset.</p>
      </details>
      {editing && (
        <EventEditor
          event={editing}
          timeZone={zone}
          resources={resources(scenario)}
          isNew={!events.current.some((e) => e.id === editing.id)}
          onSave={save}
          onDelete={() => {
            events.current = events.current.filter((e) => e.id !== editing.id);
            calendar.current?.update({ events: events.current });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
          onRestoreFocus={() => {
            if (focusReturn.current?.isConnected) focusReturn.current.focus();
            else
              host.current
                ?.querySelector<HTMLElement>(
                  `[data-event-id="${CSS.escape(editing.id)}"]`,
                )
                ?.focus();
          }}
        />
      )}
    </main>
  );
}
createRoot(document.querySelector("#app")!).render(<App />);
