import { createApp, h, reactive } from "vue";
import { Calendar, type CalendarOptions } from "../src/vue/index.js";
import { atMinute } from "../src/core/index.js";
import "../src/dom/style.css";
import "./demo.css";
const day = "2026-11-03",
  zone = "Asia/Tokyo";
const options = reactive<CalendarOptions>({
  date: atMinute(day, 0, zone),
  view: "day",
  timeZone: zone,
  scrollToMinute: 480,
  events: [
    {
      id: "vue-1",
      title: "Vue event",
      start: atMinute(day, 540, zone),
      end: atMinute(day, 600, zone),
    },
  ],
  onEventChange: (change) => {
    options.events = options.events.map((event) =>
      event.id === change.event.id
        ? {
            ...event,
            start: change.start,
            end: change.end,
            allDay: change.allDay,
          }
        : event,
    );
  },
  onSelectSlot: (slot) => {
    options.events = [
      ...options.events,
      {
        id: crypto.randomUUID(),
        title: "New Vue event",
        start: slot.start,
        end: slot.end,
        allDay: slot.allDay,
      },
    ];
  },
});
createApp({
  render: () =>
    h(
      Calendar,
      { options },
      {
        event: ({ event }: { event: { title: string } }) =>
          h("strong", { "data-custom": "vue" }, event.title),
      },
    ),
}).mount("#app");
