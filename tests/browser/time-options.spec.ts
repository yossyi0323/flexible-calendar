import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fc-time-column").first()).toBeVisible();
});

test("time column accessible name keeps the date and resource with either instruction", async ({
  page,
}) => {
  const column = page.locator(".fc-time-column").first();
  await expect(column).toHaveAccessibleName(
    /Nov 3.*PLAN; arrow keys choose time, Enter selects/,
  );
  await page.evaluate(() =>
    window.demoCalendar.update({
      locale: "ja-JP",
      messages: {
        timeColumnInstruction: "矢印キーで時刻を選び、Enter キーで確定",
      },
    }),
  );
  await expect(column).toHaveAccessibleName(
    /11月3日.*PLAN; 矢印キーで時刻を選び、Enter キーで確定/,
  );
});

test("shared gutter markers follow the hour scale and exclude out-of-range minutes", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.demoCalendar.update({
      minMinute: 360,
      maxMinute: 1080,
      hourHeight: 72,
      timeGutterMarkers: (columns) =>
        [359, 450, 1080].map((minute) => {
          const icon = document.createElement("span");
          icon.setAttribute("role", "img");
          icon.setAttribute("aria-label", `${columns[0]!.date} at ${minute}`);
          return { minute, content: icon };
        }),
    }),
  );
  const markers = page.locator(".fc-gutter-marker");
  await expect(markers).toHaveCount(1);
  await expect(markers.getByRole("img")).toHaveAccessibleName(
    "2026-11-03 at 450",
  );
  await expect(markers).toHaveCSS("pointer-events", "none");
  await expect(markers).toHaveCSS("top", "108px");
  await page.evaluate(() => {
    window.demoCalendar.update({ hourHeight: 90 });
    window.demoCalendar.scrollToTime(480);
  });
  await expect(markers).toHaveCSS("top", "135px");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(markers.getByRole("img")).toHaveAccessibleName(
    "2026-11-06 at 450",
  );
});

test("empty all-day row follows visible dates, resources and event-only updates", async ({
  page,
}) => {
  const row = page.locator(".fc-all-day-row");
  await page.evaluate(() =>
    window.demoCalendar.update({ hideEmptyAllDayRow: true }),
  );
  await expect(row).toBeVisible();
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await expect(row).toBeHidden();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(row).toBeVisible();
  await page.evaluate(() => {
    const c = window.demoCalendar;
    c.update({
      events: c
        .getOptions()
        .events.map((e) => (e.allDay ? { ...e, resourceId: "outside" } : e)),
    });
  });
  await expect(row).toBeHidden();
  await page.evaluate(() => {
    const c = window.demoCalendar;
    c.update({
      events: c
        .getOptions()
        .events.map((e) => (e.allDay ? { ...e, resourceId: "do" } : e)),
    });
  });
  await expect(row.getByRole("button", { name: /Release day/ })).toBeVisible();
  await page.evaluate(() => window.demoCalendar.update({ events: [] }));
  await expect(row).toBeHidden();
  await page.evaluate(() =>
    window.demoCalendar.update({ hideEmptyAllDayRow: false }),
  );
  await expect(row.getByRole("group").first()).toBeVisible();
});
