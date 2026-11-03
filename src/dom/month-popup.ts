import type { CalendarEvent, DateKey } from "../core/index.js";
import type { CalendarContext } from "./context.js";
import { button, element } from "./helpers.js";
/** Native modal semantics provide focus containment and a consistent Escape path. */
export function createMonthPopup<E extends CalendarEvent>(
  ctx: CalendarContext<E>,
) {
  let dispose: (() => void) | undefined;
  ctx.onViewCleanup(() => dispose?.());
  return (events: readonly E[], day: DateKey, anchor: HTMLButtonElement) => {
    dispose?.();
    const { doc, root, dayLabel, messages, eventNode } = ctx;
    const dialog = element(doc, "dialog", "fc-month-popup");
    dialog.setAttribute("aria-label", dayLabel(day));
    let closed = false;
    const close = (restore = true, notify = true) => {
      if (closed) return;
      closed = true;
      dialog.close();
      dialog.remove();
      if (restore && anchor.isConnected) anchor.focus({ preventScroll: true });
      if (notify) ctx.options.onRender?.();
    };
    dispose = () => close(false, false);
    const header = element(doc, "div", "fc-popup-header");
    header.append(
      element(doc, "h3", "fc-popup-title", dayLabel(day)),
      button(doc, messages().close, () => close()),
    );
    dialog.append(header);
    const list = element(doc, "div", "fc-popup-events");
    for (const event of events) {
      const node = eventNode(event, day);
      node.querySelectorAll(".fc-resize").forEach((handle) => handle.remove());
      // Let selection handlers measure the segment while the dialog is open.
      node.addEventListener("click", () => close(false));
      list.append(node);
    }
    dialog.append(list);
    root.append(dialog);
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    dialog.addEventListener("click", (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        close();
    });
    dialog.showModal();
    ctx.options.onRender?.();
  };
}
