import { type CalendarEvent, type DateKey } from "../core/index.js";
import { applyStyle, button, element, setContent } from "./helpers.js";
import type { CalendarContext } from "./context.js";
export function eventNode<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
  event: E,
  date: DateKey,
  timed = false,
) {
  const {
    options,
    doc,
    view,
    messages,
    timeLabel,
    canEdit,
    eventKeyboard,
    isClickSuppressed,
  } = ctx;
  const node = button(
    doc,
    "",
    (source) => {
      if (!isClickSuppressed()) ctx.options.onSelectEvent?.(event, source);
    },
    "fc-event",
  );
  node.dataset.eventId = event.id;
  node.dataset.date = date;
  node.setAttribute(
    "aria-label",
    `${event.title} ${event.allDay ? messages().allDay : `${timeLabel(event.start)}–${timeLabel(event.end)}`}`,
  );
  if (event.id === options.selectedEventId) node.classList.add("fc-selected");
  if (event.color) node.style.setProperty("--fc-event-color", event.color);
  applyStyle(node, options.eventStyle?.(event));
  const body = element(doc, "span", "fc-event-content");
  if (options.renderEvent)
    setContent(body, options.renderEvent(event, { view: view(), date }));
  else {
    body.append(element(doc, "span", "fc-event-title", event.title));
    if (!event.allDay && timed) {
      body.append(doc.createTextNode(" "));
      body.append(
        element(
          doc,
          "span",
          "fc-event-time",
          `${timeLabel(event.start)}–${timeLabel(event.end)}`,
        ),
      );
    }
  }
  node.append(body);
  node.addEventListener("dblclick", (source) =>
    ctx.options.onDoubleClickEvent?.(event, source),
  );
  node.addEventListener("keydown", (source) =>
    eventKeyboard(source, event, date),
  );
  if (canEdit(event)) {
    node.classList.add("fc-editable");
    if (options.resizable !== false)
      for (const edge of ["start", "end"] as const) {
        const handle = element(doc, "span", `fc-resize fc-resize-${edge}`);
        handle.dataset.edge = edge;
        handle.setAttribute("aria-hidden", "true");
        node.append(handle);
      }
  }
  return node;
}
