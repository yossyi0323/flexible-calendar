import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { cpus, platform, arch } from "node:os";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4174",
    "--strictPort",
  ],
  { stdio: "pipe" },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (data) => {
      if (data.toString().includes("4174")) resolve();
    });
    server.on("exit", () => reject(new Error("Benchmark server exited")));
    setTimeout(() => reject(new Error("Server timeout")), 15000).unref();
  });
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto("http://127.0.0.1:4174");
  const rows = await page.evaluate(async () => {
    const { createCalendar } = await import("/src/dom/index.ts");
    const median = (values) =>
      values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const results = [];
    for (const count of [100, 500, 2000])
      for (const view of ["vertical", "month"]) {
        const mount = [],
          update = [],
          nodes = [];
        for (let trial = 0; trial < 4; trial++) {
          const host = document.createElement("div");
          document.body.append(host);
          const events = Array.from({ length: count }, (_, i) => {
            const start = new Date(
              Date.UTC(2026, 10, 2 + (i % 7), 0, (i * 17) % 600),
            );
            return {
              id: String(i),
              title: `Event ${i}`,
              start,
              end: new Date(+start + 3600000),
              resourceId: `r${i % 3}`,
            };
          });
          const start = performance.now();
          const calendar = createCalendar(host, {
            events,
            date: new Date("2026-11-02T00:00:00Z"),
            timeZone: "UTC",
            view,
            days: 7,
            resources: [0, 1, 2].map((i) => ({
              id: `r${i}`,
              title: `Resource ${i}`,
            })),
          });
          void host.offsetHeight;
          const mounted = performance.now() - start;
          const changed = events.map((event, i) =>
            i === 0 ? { ...event, title: "Updated" } : event,
          );
          const before = performance.now();
          calendar.update({ events: changed });
          void host.offsetHeight;
          const updated = performance.now() - before;
          if (trial) {
            mount.push(mounted);
            update.push(updated);
            nodes.push(host.querySelectorAll("*").length);
          }
          calendar.destroy();
          host.remove();
        }
        results.push({
          count,
          view,
          mountMs: +median(mount).toFixed(2),
          updateMs: +median(update).toFixed(2),
          domNodes: median(nodes),
        });
      }
    return results;
  });
  const report = {
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0].model,
    browser: browser.version(),
    method:
      "Median of 3 after 1 warm-up; synchronous rendering plus forced layout; seven days / three resources; no CPU throttling",
    rows,
  };
  const file = process.argv[2] ?? "benchmarks/latest.json";
  writeFileSync(file, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
