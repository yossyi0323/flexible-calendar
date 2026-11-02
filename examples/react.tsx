import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calendar } from "../src/react/index.js";
import { atMinute, type CalendarEvent } from "../src/core/index.js";
import "../src/dom/style.css";
import "./demo.css";
const day = "2026-11-03",
  zone = "Asia/Tokyo";
function App() {
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
      date={atMinute(day, 0, zone)}
      view="day"
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
    <App />
  </StrictMode>,
);
