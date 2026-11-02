import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("..", import.meta.url));
const directory = mkdtempSync(join(tmpdir(), "flexible-calendar-consumer-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, cwd = directory) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const packed = JSON.parse(
    run(
      npm,
      ["pack", "--ignore-scripts", "--json", "--pack-destination", directory],
      root,
    ),
  )[0];
  const names = new Set(packed.files.map((file) => file.path));
  for (const path of [
    "dist/core/index.js",
    "dist/core/index.d.ts",
    "dist/dom/index.js",
    "dist/react/index.js",
    "dist/vue/index.js",
    "dist/style.css",
    "LICENSE",
  ])
    assert(names.has(path), `Missing ${path}`);
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      name: "calendar-consumer-smoke",
      private: true,
      type: "module",
    }),
  );
  run(npm, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(directory, packed.filename),
  ]);
  assert(
    !existsSync(join(directory, "node_modules/react")),
    "The engine must not install React",
  );
  assert(
    !existsSync(join(directory, "node_modules/vue")),
    "The engine must not install Vue",
  );
  run(process.execPath, [
    "--input-type=module",
    "-e",
    `
    import { atMinute, buildColumns } from '@yossyi0323/flexible-calendar';
    import { createCalendar } from '@yossyi0323/flexible-calendar/dom';
    import { readFileSync } from 'node:fs';
    if (typeof createCalendar !== 'function') throw Error('DOM export missing');
    const columns = buildColumns({ date: atMinute('2026-11-03', 0, 'Asia/Tokyo'), events: [], view: 'vertical', days: 3, timeZone: 'Asia/Tokyo', resources: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] });
    if (columns.length !== 6) throw Error('Core export failed');
    if (!readFileSync(new URL(import.meta.resolve('@yossyi0323/flexible-calendar/style.css')), 'utf8').includes('data-theme=dark') && !readFileSync(new URL(import.meta.resolve('@yossyi0323/flexible-calendar/style.css')), 'utf8').includes('data-theme="dark"')) throw Error('Styles missing');
  `,
  ]);
  run(npm, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "react@18",
    "react-dom@18",
    "vue@3.3.13",
    "@types/react@18",
    "@types/react-dom@18",
    "typescript@5",
  ]);
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        jsx: "react-jsx",
        skipLibCheck: false,
        lib: ["ES2022", "DOM", "DOM.Iterable"],
      },
      include: ["consumer.tsx"],
    }),
  );
  writeFileSync(
    join(directory, "consumer.tsx"),
    `
    import { Calendar as ReactCalendar } from '@yossyi0323/flexible-calendar/react';
    import { Calendar as VueCalendar } from '@yossyi0323/flexible-calendar/vue';
    import { type CalendarEvent, atMinute } from '@yossyi0323/flexible-calendar';
    const events: CalendarEvent[] = [];
    const date = atMinute('2026-11-03', 0, 'Asia/Tokyo');
    export const react = <ReactCalendar date={date} events={events} renderReactEvent={event => <span>{event.title}</span>} />;
    export const vue = VueCalendar;
  `,
  );
  run(process.execPath, [
    join(directory, "node_modules/typescript/bin/tsc"),
    "--project",
    join(directory, "tsconfig.json"),
  ]);
  run(process.execPath, [
    "--input-type=module",
    "-e",
    `
    import { createElement } from 'react';
    import { renderToString } from 'react-dom/server';
    import { Calendar as ReactCalendar } from '@yossyi0323/flexible-calendar/react';
    import { createSSRApp, h } from 'vue';
    import { renderToString as renderVue } from '@vue/server-renderer';
    import { Calendar as VueCalendar } from '@yossyi0323/flexible-calendar/vue';
    const options = {date:new Date(),events:[]};
    if (!renderToString(createElement(ReactCalendar, options)).includes('<div')) throw Error('React SSR failed');
    if (!(await renderVue(createSSRApp({ render:()=>h(VueCalendar,{options}) }))).includes('<div')) throw Error('Vue SSR failed');
  `,
  ]);
  const manifest = JSON.parse(
    readFileSync(
      join(
        directory,
        "node_modules/@yossyi0323/flexible-calendar/package.json",
      ),
      "utf8",
    ),
  );
  console.log(
    `Tarball smoke passed: ${manifest.name}@${manifest.version}; no-framework imports, CSS, React 18 / Vue types and SSR.`,
  );
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
