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

Use Conventional Commits. Follow the [versioning and release policy](docs/releasing.md): classify each PR as no release, patch, minor, or breaking, and explain its compatibility impact. Document public API changes in the API reference and consumer-visible changes in the pending section of `CHANGELOG.md`. Breaking changes require migration notes, including during 0.x. Do not bump the package version in ordinary feature or fix PRs; versions are finalized in release PRs.

Use the PR template to record the classification, consumer impact, and relevant verification. Do not publish a package or change repository visibility as part of ordinary implementation work; see the release policy.
