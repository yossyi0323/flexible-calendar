import {
  eventsInDay,
  eventResourceIds,
  type CalendarEvent,
} from "../core/index.js";
import { element } from "./helpers.js";
import type { CalendarContext } from "./context.js";
export function agendaView<E extends CalendarEvent>(ctx: CalendarContext<E>) {
  const {
    options,
    doc,
    scroller,
    tz,
    messages,
    dayLabel,
    timeLabel,
    dates,
    eventNode,
  } = ctx;
  const table = element(doc, "table", "fc-agenda");
  const caption = element(doc, "caption", "fc-sr-only", messages().agenda);
  table.append(caption);
  const body = doc.createElement("tbody");
  let count = 0;
  for (const day of dates()) {
    const events = eventsInDay(options.events, day, tz());
    for (const [index, event] of events.entries()) {
      count++;
      const row = doc.createElement("tr");
      const dateCell = doc.createElement("th");
      dateCell.scope = "row";
      dateCell.textContent = index === 0 ? dayLabel(day) : "";
      const time = element(
        doc,
        "td",
        "fc-agenda-time",
        event.allDay
          ? messages().allDay
          : `${timeLabel(event.start)} – ${timeLabel(event.end)}`,
      );
      const title = doc.createElement("td");
      title.append(eventNode(event, day));
      const resource = element(
        doc,
        "td",
        "fc-agenda-resource",
        eventResourceIds(event)
          .map(
            (id) =>
              (options.resourcesForDate?.(day) ?? options.resources)?.find(
                (r) => r.id === id,
              )?.title ?? id,
          )
          .join(", "),
      );
      row.append(dateCell, time, title, resource);
      body.append(row);
    }
  }
  table.append(body);
  scroller.append(
    count ? table : element(doc, "p", "fc-empty", messages().noEvents),
  );
}
