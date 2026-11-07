# Release procedure

The source is public on GitHub. The npm package stays private until the owner approves a registry release.

## Versioning

Version numbers identify Git and tarball builds even before npm publication.
During 0.x, increment the minor version for new public capabilities or breaking
API changes, and the patch version for compatible fixes. Document breaking
changes and migration steps explicitly; a minor increment alone does not imply
that existing consumers must change their code.

Update `package.json`, the root and package entries in `package-lock.json`, and
the README version together. Add a separate changelog section for each version;
keep it marked Unreleased until release. Historical verification records retain
the version they actually verified. Version bumps do not publish the package or
create a release tag.

## Publishing

1. Review [features and differences](features.md), [date semantics](dates.md) and [verification](verification.md). Try all views in light/dark themes, keyboard operation and the intended touch devices.
2. Run `npm ci`, `npm run format:check`, `npm run check`, `npm run test:package`, and the browser suite after `npx playwright install`.
3. Run `npm pack --dry-run` and inspect the file list. Run `npm pack`, install that tarball in clean plain-TypeScript, React and Vue consumer projects, and verify the exports. `style.css` is a bundler asset, not a JavaScript module; the type-resolution checker excludes that asset entry only.
4. Decide which documented differences block the first public version. Until accepted, this remains an unreleased 0.x preview rather than a parity-certified replacement.
5. After explicit owner approval, remove `private: true`, confirm the npm scope/name and version, update the changelog, and choose registry access. Repository visibility and npm publishing are separate actions.
6. Publish manually and tag the reviewed commit. Do not publish from an unreviewed working tree. Package availability and ownership have not been claimed or reserved by this implementation.

The package is ESM-only. Supported consumers use Node16/NodeNext ESM resolution or a modern bundler. CommonJS requires dynamic `import`; no legacy Node10 resolution bundle is shipped. The engine and DOM renderer do not need React/Vue. Framework users install the matching optional peer dependencies themselves.
