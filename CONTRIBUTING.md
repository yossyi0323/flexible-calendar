# Contributing

Use Node 20.19+ (or 22.12+) and npm. Run `npm ci`, `npm run dev`, and the checks below. No account, tokens or external services are needed.

```sh
npm run check
npx playwright install
npm run test:e2e
npm run test:package
npm run format:check
```

Keep calculations independent from the DOM and frameworks. Add regression tests for date/interaction changes, including exclusive midnight boundaries and DST where relevant. Never mutate caller event records. UI changes must work in light and dark themes and include keyboard behavior. Avoid global styles and framework imports from the core entry.

Use Conventional Commits. Document new public options and changes in `CHANGELOG.md`. API changes during 0.x still need migration notes. Do not publish a package or change repository visibility as part of ordinary implementation work; see the release procedure.
