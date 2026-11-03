import { atMinute, addDays, type CalendarEvent } from "../src/core/index.js";
export const zone = "Asia/Tokyo";
export const day = "2026-11-03";
export const at = (minute: number, offset = 0) =>
  atMinute(addDays(day, offset), minute, zone);
export function seed(scenario: string): CalendarEvent[] {
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
      color: "#3f3f46",
    },
    {
      id: "2",
      title: scenario === "rooms" ? "Engineering sync" : "Deep work",
      start: at(9 * 60 + 15),
      end: at(10 * 60 + 15),
      ...resource(1),
      color: "#52525b",
    },
    {
      id: "3",
      title: "Research & notes",
      start: at(10 * 60),
      end: at(11 * 60),
      ...resource(0),
      color: "#57534e",
    },
    {
      id: "4",
      title: "Lunch with the team",
      start: at(12 * 60),
      end: at(13 * 60),
      ...resource(0),
      color: "#44403c",
    },
    {
      id: "5",
      title: "Across midnight",
      start: at(23 * 60),
      end: at(60, 1),
      ...resource(0),
      color: "#52525b",
    },
    {
      id: "6",
      title: "Release day",
      start: at(0, 1),
      end: at(0, 2),
      ...resource(1),
      allDay: true,
      color: "#52525b",
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
export function resources(scenario: string) {
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
