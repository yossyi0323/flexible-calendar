import { expect, it } from "vitest";
import { adaptEvents, adaptResources } from "../src/core/index.js";
it("maps custom schemas without discarding original records", () => {
  const record = {
    key: "a",
    name: "Meeting",
    from: new Date("2026-11-03T00:00Z"),
    until: new Date("2026-11-03T01:00Z"),
    room: "cedar",
    extra: { notes: "Keep this" },
  };
  const result = adaptEvents([record], {
    id: "key",
    title: "name",
    start: "from",
    end: "until",
    resourceId: (r) => r.room,
  });
  expect(result[0]?.id).toBe("a");
  expect(result[0]?.source).toBe(record);
  expect(result[0]?.resourceId).toBe("cedar");
  expect(
    adaptResources([{ key: "cedar", label: "Cedar" }], {
      id: "key",
      title: "label",
    })[0]?.title,
  ).toBe("Cedar");
});
