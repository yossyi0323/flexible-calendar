import { createContext, StrictMode, useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Calendar,
  type ToolbarContext,
  type View,
} from "../src/react/index.js";
import { atMinute, type CalendarEvent } from "../src/core/index.js";
import "../src/dom/style.css";
import "./demo.css";
import { Button } from "./ui/button.js";
const day = "2026-11-03",
  zone = "Asia/Tokyo";
const NavigationLabels = createContext<{
  previous: string;
  next: string;
} | null>(null);
function Toolbar({ label, view, views, navigate, setView }: ToolbarContext) {
  const labels = useContext(NavigationLabels);
  if (!labels) throw new Error("Toolbar requires navigation labels");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => navigate("previous")}>
        {labels.previous}
      </Button>
      <strong aria-live="polite">{label}</strong>
      <Button variant="outline" onClick={() => navigate("next")}>
        {labels.next}
      </Button>
      {views.map((value) => (
        <Button
          key={value}
          aria-pressed={view === value}
          variant={view === value ? "default" : "outline"}
          onClick={() => setView(value)}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Button>
      ))}
    </div>
  );
}
function App() {
  const [date, setDate] = useState(() => atMinute(day, 0, zone));
  const [view, setView] = useState<View>("day");
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: "react-1",
      title: "React event",
      start: atMinute(day, 540, zone),
      end: atMinute(day, 600, zone),
    },
  ]);
  return (
    <Calendar
      date={date}
      view={view}
      views={["day", "week"]}
      onNavigate={setDate}
      onViewChange={setView}
      renderReactToolbar={(context) => <Toolbar {...context} />}
      events={events}
      timeZone={zone}
      scrollToMinute={480}
      renderReactEvent={(event) => (
        <strong data-custom="react">{event.title}</strong>
      )}
      onEventChange={(change) =>
        setEvents((current) =>
          current.map((event) =>
            event.id === change.event.id
              ? {
                  ...event,
                  start: change.start,
                  end: change.end,
                  allDay: change.allDay,
                }
              : event,
          ),
        )
      }
      onSelectSlot={(slot) =>
        setEvents((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            title: "New React event",
            start: slot.start,
            end: slot.end,
            allDay: slot.allDay,
          },
        ])
      }
    />
  );
}
createRoot(document.querySelector("#app")!).render(
  <StrictMode>
    <NavigationLabels.Provider value={{ previous: "Previous", next: "Next" }}>
      <App />
    </NavigationLabels.Provider>
  </StrictMode>,
);
