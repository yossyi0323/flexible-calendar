import type { Content, ElementStyle, Messages } from "./types.js";
export const englishMessages: Messages = {
  today: "Today",
  close: "Close",
  previous: "Previous",
  next: "Next",
  allDay: "All day",
  noEvents: "No events in this range",
  day: "Day",
  week: "Week",
  "work-week": "Work week",
  month: "Month",
  agenda: "Agenda",
  vertical: "Vertical",
  more: (n) => `+${n} more`,
};
export function element<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
  content?: Content,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  node.className = className;
  if (content !== undefined) setContent(node, content);
  return node;
}
export function setContent(node: HTMLElement, content: Content): void {
  if (typeof content === "string") node.textContent = content;
  else node.append(content);
}
export function applyStyle(node: HTMLElement, value?: ElementStyle): void {
  if (value?.className) node.className += ` ${value.className}`;
  if (value?.style) Object.assign(node.style, value.style);
}
export function button(
  doc: Document,
  label: string,
  action: (event: MouseEvent) => void,
  className = "fc-button",
): HTMLButtonElement {
  const node = element(doc, "button", className, label);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}
