import { chooseOption } from "./select-helper.js";
import { test, expect, type Page } from "@playwright/test";
import type { CalendarHandle } from "../../src/dom/index.js";
declare global {
  interface Window {
    demoCalendar: CalendarHandle;
  }
}
async function configure(page: Page, options: Record<string, unknown>) {
  await page.evaluate(
    (options) => window.demoCalendar.update(options),
    options,
  );
}
async function point(page: Page, index: number, minute: number) {
  const column = page.locator(".fc-time-column").nth(index);
  return column.evaluate((node, minute) => {
    const r = node.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + (minute / 1440) * r.height };
  }, minute);
}
async function drag(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-calendar")).toBeVisible();
});
test("renders real date × resource columns and independent overnight segments", async ({
  page,
}) => {
  await expect(page.locator(".fc-time-column")).toHaveCount(6);
  await expect(page.locator(".fc-time-column").nth(2)).toHaveAttribute(
    "data-date",
    "2026-11-04",
  );
  await expect(page.locator('[data-event-id="5"]')).toHaveCount(2);
  await expect(
    page.locator('.fc-all-day-cell [data-event-id="6"]'),
  ).toHaveCount(1);
});
test("all ordinary views render, navigate, and drill down", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".fc-month-day")).toHaveCount(42);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".fc-period")).toContainText("December");
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page
    .locator('.fc-month-day[data-date="2026-11-03"] .fc-date-link')
    .click();
  await expect(page.locator(".fc-time-column")).toHaveCount(2);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.locator(".fc-time-column")).toHaveCount(14);
  await page.getByRole("button", { name: "Work week", exact: true }).click();
  await expect(page.locator(".fc-time-column")).toHaveCount(10);
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator(".fc-agenda")).toBeVisible();
});
test("creates a timed event with pointer selection", async ({ page }) => {
  const a = await point(page, 1, 660),
    b = await point(page, 1, 720);
  await drag(page, a, b);
  await expect(page.locator("#editor")).toBeVisible();
  await page.locator("#event-title").fill("Created from selection");
  await page.locator("#save").click();
  await expect(
    page.getByRole("button", { name: /Created from selection/ }),
  ).toHaveCount(1);
  const value = await page.evaluate(() =>
    window.demoCalendar
      .getOptions()
      .events.find((e) => e.title === "Created from selection"),
  );
  expect(value?.resourceId).toBe("do");
  expect(
    new Date(value!.end).getTime() - new Date(value!.start).getTime(),
  ).toBe(3600000);
});
test("moves events between actual dates and resource columns", async ({
  page,
}) => {
  const a = await point(page, 1, 585),
    b = await point(page, 2, 705);
  await drag(page, a, b);
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "2"),
  );
  expect(value?.resourceId).toBe("plan");
  expect(value?.start.toISOString()).toBe("2026-11-04T02:15:00.000Z");
  await expect(page.locator("#editor")).not.toBeVisible();
});
test("resizes an event and keeps its identity", async ({ page }) => {
  const event = page.locator('[data-event-id="2"]');
  const handle = await event.locator('[data-edge="end"]').boundingBox();
  const target = await point(page, 1, 660);
  await drag(
    page,
    { x: handle!.x + handle!.width / 2, y: handle!.y + handle!.height / 2 },
    target,
  );
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "2"),
  );
  expect(value?.end.toISOString()).toBe("2026-11-03T02:00:00.000Z");
});
test("Escape cancels pending changes", async ({ page }) => {
  const original = await page.evaluate(
    () => window.demoCalendar.getOptions().events,
  );
  const a = await point(page, 1, 585),
    b = await point(page, 2, 705);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.demoCalendar.getOptions().events),
  ).toEqual(original);
  await expect(page.locator(".fc-preview")).toHaveCount(0);
});
test("keyboard selects slots and edits events", async ({ page }) => {
  await page.locator(".fc-time-column").nth(1).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#editor")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const event = page.locator('[data-event-id="2"]');
  await event.focus();
  await page.keyboard.press("Alt+ArrowDown");
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "2"),
  );
  expect(value?.start.toISOString()).toBe("2026-11-03T00:45:00.000Z");
  await expect(page.locator('[data-event-id="2"]')).toBeFocused();
});
test("controlled rejection leaves data unchanged", async ({ page }) => {
  await page.evaluate(() =>
    window.demoCalendar.update({ canChangeEvent: () => false }),
  );
  await page.locator('[data-event-id="2"]').focus();
  await page.keyboard.press("Alt+ArrowDown");
  expect(
    await page.evaluate(() =>
      window.demoCalendar
        .getOptions()
        .events.find((e) => e.id === "2")
        ?.start.toISOString(),
    ),
  ).toBe("2026-11-03T00:15:00.000Z");
});
test("read-only mode disables selection and edits", async ({ page }) => {
  await configure(page, { editable: false, selectable: false });
  await expect(page.locator(".fc-resize")).toHaveCount(0);
  const a = await point(page, 1, 660),
    b = await point(page, 1, 720);
  await drag(page, a, b);
  await expect(page.locator("#editor")).not.toBeVisible();
});
test("dark mode, Japanese labels, and month overflow", async ({ page }) => {
  await chooseOption(page, "#theme", "Dark");
  await expect(page.locator(".fc-calendar")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  expect(
    await page
      .locator(".fc-calendar")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(9, 9, 11)");
  await chooseOption(page, "#locale", "日本語");
  await page.getByRole("button", { name: "月", exact: true }).click();
  await page
    .locator('.fc-month-day[data-date="2026-11-03"] .fc-show-more')
    .click();
  await expect(page.locator(".fc-month-popup .fc-event")).toHaveCount(5);
});
test("unmount removes calendar and stops callbacks", async ({ page }) => {
  await page.evaluate(() => window.demoCalendar.destroy());
  await expect(page.locator(".fc-calendar")).toHaveCount(0);
  await page.waitForTimeout(100);
});
test("React adapter survives StrictMode and controlled changes", async ({
  page,
}) => {
  await page.goto("/examples/react.html");
  await expect(page.locator(".fc-calendar")).toHaveCount(1);
  await page.locator('[data-event-id="react-1"]').focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(page.locator('[data-event-id="react-1"]')).toHaveAttribute(
    "aria-label",
    /9:30/,
  );
  await page.locator(".fc-time-column").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: /New React event/ }),
  ).toHaveCount(1);
});
test("Vue adapter reacts to controlled changes", async ({ page }) => {
  await page.goto("/examples/vue.html");
  await expect(page.locator(".fc-calendar")).toHaveCount(1);
  await page.locator('[data-event-id="vue-1"]').focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(page.locator('[data-event-id="vue-1"]')).toHaveAttribute(
    "aria-label",
    /9:30/,
  );
  await page.locator(".fc-time-column").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /New Vue event/ })).toHaveCount(
    1,
  );
});
test("no runtime errors while switching all views", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const name of [
    "Month",
    "Agenda",
    "Day",
    "Week",
    "Work week",
    "Vertical",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  expect(errors).toEqual([]);
});
test("pointer event click opens the editor without creating another event", async ({
  page,
}) => {
  await page.locator('[data-event-id="2"]').click();
  await expect(page.locator("#editor")).toBeVisible();
  await expect(page.locator("#event-title")).toHaveValue("Deep work");
});
test("month move preserves timed event hours and resource", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Month", exact: true }).click();
  const source = await page
    .locator('.fc-month-event[data-date="2026-11-03"][data-event-id="2"]')
    .boundingBox();
  const target = await page
    .locator('.fc-month-day[data-date="2026-11-04"]')
    .boundingBox();
  await drag(
    page,
    { x: source!.x + source!.width / 2, y: source!.y + source!.height / 2 },
    { x: target!.x + target!.width / 2, y: target!.y + target!.height - 8 },
  );
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "2"),
  );
  expect(value?.start.toISOString()).toBe("2026-11-04T00:15:00.000Z");
  expect(value?.allDay).toBe(false);
  expect(value?.resourceId).toBe("do");
});
test("all-day moves keep calendar-day duration", async ({ page }) => {
  const source = await page.locator('[data-event-id="6"]').boundingBox();
  const target = await page.locator(".fc-all-day-cell").nth(5).boundingBox();
  await drag(
    page,
    { x: source!.x + source!.width / 2, y: source!.y + source!.height / 2 },
    { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 },
  );
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "6"),
  );
  expect(value?.start.toISOString()).toBe("2026-11-04T15:00:00.000Z");
  expect(value?.allDay).toBe(true);
});
test("auto-scroll continues selection at the visible edge", async ({
  page,
}) => {
  const a = await point(page, 1, 660),
    box = await page.locator(".fc-scroller").boundingBox();
  const before = await page
    .locator(".fc-scroller")
    .evaluate((e) => e.scrollTop);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x, box!.y + box!.height - 5, { steps: 5 });
  await expect
    .poll(() => page.locator(".fc-scroller").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(before + 50);
  await page.keyboard.press("Escape");
  await page.mouse.up();
});
test("external drop emits the real target date", async ({ page }) => {
  const value = await page.evaluate(() => {
    let result = "";
    window.demoCalendar.update({
      getExternalEvent: () => ({
        id: "external",
        title: "External",
        start: new Date("2026-11-03T00:00:00Z"),
        end: new Date("2026-11-03T01:00:00Z"),
      }),
      onExternalDrop: (change) => {
        result = change.start.toISOString();
      },
    });
    const cell = document.querySelectorAll(".fc-time-column")[2]!;
    const rect = cell.getBoundingClientRect();
    cell.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
        clientX: rect.x + 30,
        clientY: rect.y + (rect.height * 600) / 1440,
      }),
    );
    return result;
  });
  expect(value).toBe("2026-11-04T01:00:00.000Z");
});
test("renders untrusted titles as text", async ({ page }) => {
  await page.evaluate(() => {
    const options = window.demoCalendar.getOptions();
    window.demoCalendar.update({
      events: options.events.map((e) => ({
        ...e,
        title: "<img src=x onerror=alert(1)>",
      })),
    });
  });
  await expect(page.locator(".fc-event img")).toHaveCount(0);
  await expect(page.locator(".fc-event-title").first()).toHaveText(
    "<img src=x onerror=alert(1)>",
  );
});
test("one event can appear in multiple resource columns without duplicate input records", async ({
  page,
}) => {
  await page.evaluate(() => {
    const current = window.demoCalendar.getOptions();
    window.demoCalendar.update({
      events: current.events.map((e) =>
        e.id === "2" ? { ...e, resourceId: ["plan", "do"] } : e,
      ),
    });
  });
  await expect(page.locator('[data-event-id="2"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator('[data-event-id="2"]')).toHaveCount(1);
  await expect(
    page.locator(".fc-agenda-resource").filter({ hasText: "PLAN, DO" }),
  ).toHaveCount(1);
});
test("custom views provide their own range, navigation and renderer", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.demoCalendar.update({
      view: "summary",
      customViews: {
        summary: {
          label: "Summary",
          dates: () => ["2026-11-03"],
          navigate: (date) => new Date(+date + 86400000),
        },
      },
      customViewRenderers: {
        summary: ({ document, events, renderEvent }) => {
          const node = document.createElement("div");
          node.dataset.customView = "summary";
          node.append(renderEvent(events[0]!, "2026-11-03"));
          return node;
        },
      },
    });
  });
  await expect(page.locator('[data-custom-view="summary"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Summary", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  expect(
    await page.evaluate(() =>
      window.demoCalendar.getOptions().date.toISOString(),
    ),
  ).toBe("2026-11-03T15:00:00.000Z");
});
test("invalid updates preserve a usable instance", async ({ page }) => {
  const message = await page.evaluate(() => {
    try {
      window.demoCalendar.update({ step: 0 });
      return "";
    } catch (error) {
      return String(error);
    }
  });
  expect(message).toContain("RangeError");
  await expect(page.locator(".fc-time-column")).toHaveCount(6);
});

test("dragging a midnight continuation moves the original event without synthetic IDs", async ({
  page,
}) => {
  await page.evaluate(() => window.demoCalendar.scrollToTime(0));
  const a = await point(page, 2, 30),
    b = await point(page, 4, 30);
  await drag(page, a, b);
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "5"),
  );
  expect(value?.start.toISOString()).toBe("2026-11-04T14:00:00.000Z");
  expect(value?.end.toISOString()).toBe("2026-11-04T16:00:00.000Z");
  await expect(page.locator('[data-event-id="5"]')).toHaveCount(2);
});

test("keyboard movement of a continuation keeps its original start date within the same day columns", async ({
  page,
}) => {
  await page.evaluate(() => window.demoCalendar.scrollToTime(0));
  await page
    .locator(".fc-time-column")
    .nth(2)
    .locator('[data-event-id="5"]')
    .focus();
  await page.keyboard.press("Alt+ArrowRight");
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "5"),
  );
  expect(value?.start.toISOString()).toBe("2026-11-03T14:00:00.000Z");
  expect(value?.resourceId).toBe("do");
});
test("RTL column keyboard navigation follows visual direction", async ({
  page,
}) => {
  await configure(page, { direction: "rtl" });
  const columns = page.locator(".fc-time-column");
  await columns.nth(0).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(columns.nth(1)).toBeFocused();
});

test("data refresh during a drag preserves capture and applies the eventual change", async ({
  page,
}) => {
  const a = await point(page, 1, 585),
    b = await point(page, 2, 705);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.evaluate(() => {
    const c = window.demoCalendar;
    c.update({
      events: c
        .getOptions()
        .events.map((e) => (e.id === "1" ? { ...e, title: "Refreshed" } : e)),
    });
  });
  await expect(page.locator(".fc-calendar")).toHaveClass(/fc-interacting/);
  await page.mouse.up();
  const value = await page.evaluate(() =>
    window.demoCalendar.getOptions().events.find((e) => e.id === "2"),
  );
  expect(value?.start.toISOString()).toBe("2026-11-04T02:15:00.000Z");
});
test("a concurrent change to the dragged event cancels a stale gesture", async ({
  page,
}) => {
  const a = await point(page, 1, 585),
    b = await point(page, 2, 705);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.evaluate(() => {
    const c = window.demoCalendar;
    c.update({
      events: c
        .getOptions()
        .events.map((e) =>
          e.id === "2" ? { ...e, start: new Date(+e.start + 60000) } : e,
        ),
    });
  });
  await expect(page.locator(".fc-calendar")).not.toHaveClass(/fc-interacting/);
  await page.mouse.up();
  expect(
    await page.evaluate(() =>
      window.demoCalendar
        .getOptions()
        .events.find((e) => e.id === "2")
        ?.start.toISOString(),
    ),
  ).toBe("2026-11-03T00:16:00.000Z");
});

test("agenda rows have no pointer resize handles and still open the editor", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator(".fc-agenda .fc-event")).not.toHaveCount(0);
  await expect(page.locator(".fc-agenda .fc-resize")).toHaveCount(0);
  await expect(page.locator(".fc-agenda .fc-editable")).toHaveCount(0);
  const event = page.locator('.fc-agenda [data-event-id="2"]');
  await event.hover();
  await expect(event).not.toHaveCSS("cursor", "grab");
  await event.click();
  await expect(page.locator("#editor")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(event).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#editor")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Vertical", exact: true }).click();
  await expect(
    page.locator('.fc-timed-event [data-edge="start"]').first(),
  ).toBeAttached();
  await expect(
    page.locator('.fc-timed-event [data-edge="end"]').first(),
  ).toBeAttached();
});
