# Versioning and releases

The source is public on GitHub. The npm package stays private until the owner approves a registry release.

## Version policy

Flexible Calendar uses [Semantic Versioning](https://semver.org/). Version numbers describe compatibility for consumers, not the size or number of commits.

| Change                                                                | Before 1.0                                 | From 1.0 onward                            |
| --------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Backward-compatible bug fix                                           | Patch: 0.2.0 → 0.2.1                       | Patch: 1.2.0 → 1.2.1                       |
| Backward-compatible public feature                                    | Minor: 0.2.1 → 0.3.0                       | Minor: 1.2.1 → 1.3.0                       |
| Breaking public change                                                | Minor: 0.2.1 → 0.3.0, with migration notes | Major: 1.2.1 → 2.0.0, with migration notes |
| Public API deprecation                                                | Minor, with replacement guidance           | Minor, with replacement guidance           |
| Documentation, tests, or internal maintenance with no consumer impact | No release required                        | No release required                        |

SemVer treats 0.x as unstable; the pre-1.0 rules above are this project's additional policy. Patch releases must preserve compatibility even during 0.x. Reset lower version components when raising a higher component. When several changes ship together, use the highest required bump.

A fix that breaks documented behavior must be classified as breaking, even if its commit uses the `fix:` prefix. Performance improvements and dependency updates are classified by their effect on consumers.

### Public compatibility contract

The contract covers:

- Exports from the package's declared entry points, including TypeScript types, DOM APIs, and React/Vue adapters.
- Documented options, defaults, callbacks and payloads, rendering hooks, date/time semantics, and interaction behavior.
- The stylesheet entry point and documented public CSS tokens and classes.
- Documented runtime, browser, framework, and module-format support.

Removing or renaming a public option, requiring a previously optional field, changing a callback payload incompatibly, or dropping a supported environment is a breaking change. An optional feature that preserves existing behavior is normally a compatible addition.

Undocumented internals, deep imports outside declared entry points, private DOM structure, and structural CSS classes are not supported extension APIs. Examples and playground UI are not public library APIs. Explicitly documented public CSS classes remain covered by the contract.

### Initial release and 1.0

Until the first release, accumulate changes under `0.1.0 — Unreleased`; do not increment the version for each PR. The first release is `0.1.0`. Apply the policy to new changes immediately by recording their classification and consumer impact, even before that release.

After the first release, collect pending changes under `Unreleased`. Choose the next version when preparing a release, not on every merge. Keep core, DOM, React, Vue, and CSS entry points on the same package version.

Release `1.0.0` when the maintainer is ready to maintain the documented public contract and supported environments under the post-1.0 rules. It does not require feature parity with another library or completion of every planned feature.

## Recording changes

Each PR must state its release classification: no release, patch, minor, or breaking. For breaking changes, state the old behavior, new behavior, and migration steps. During 0.x, “breaking” maps to a minor version bump; it remains explicitly labeled as breaking in release notes.

Add consumer-visible changes to the pending section of [CHANGELOG.md](../CHANGELOG.md), grouped as appropriate under Added, Changed, Deprecated, Removed, or Fixed. Label breaking entries explicitly and include migration guidance. Compatible additions should state when no migration is required. Write entries for consumers rather than copying commit messages.

Documentation-only, test-only, and internal changes without consumer impact need no changelog entry; explain the no-release classification in the PR. Conventional Commits help describe history but do not determine version bumps automatically.

## Release procedure

1. Review [features and differences](features.md), [date semantics](dates.md) and [verification](verification.md). Try all views in light/dark themes, keyboard operation and the intended touch devices.
2. Run `npm ci`, `npm run format:check`, `npm run check`, `npm run test:package`, and the browser suite after `npx playwright install`.
3. Run `npm pack --dry-run` and inspect the file list. Run `npm pack`, install that tarball in clean plain-TypeScript, React and Vue consumer projects, and verify the exports. `style.css` is a bundler asset, not a JavaScript module; the type-resolution checker excludes that asset entry only.
4. Decide which documented differences block the first public version. Until accepted, this remains an unreleased 0.x preview rather than a parity-certified replacement.
5. After explicit owner approval, remove `private: true`, confirm the npm scope/name and choose registry access. Repository visibility and npm publishing are separate actions.
6. Prepare a release PR: choose the version using the policy above, update `package.json` and the root package version entries in `package-lock.json`, update version references in the README, and replace the pending changelog heading with the version and release date. Add a fresh `Unreleased` section and include migration instructions for breaking changes.
7. Review and merge the release PR after the checks pass. Publish the package built from that reviewed commit, create its matching `vX.Y.Z` Git tag, and publish a GitHub Release containing the corresponding changelog notes. Verify that the registry package, tag, and release all identify the same version and source.
8. Never replace a published version or move its tag to different code. Correct released defects in a new version. If publication fails partway through, check which artifacts exist before retrying; complete missing steps against the same reviewed commit.

Do not publish from an unreviewed working tree. Package availability and ownership have not been claimed or reserved by this implementation.

The package is ESM-only. Supported consumers use Node16/NodeNext ESM resolution or a modern bundler. CommonJS requires dynamic `import`; no legacy Node10 resolution bundle is shipped. The engine and DOM renderer do not need React/Vue. Framework users install the matching optional peer dependencies themselves.
