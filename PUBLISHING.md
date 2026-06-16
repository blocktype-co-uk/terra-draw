# Publishing

This fork publishes the `@blocktype-co-uk/*` packages to GitHub Packages.

## Prerequisites

- Be on the commit that should be published.
- Make sure the package version has already been bumped in the package's `package.json`.
- Make sure the package version does not already exist in GitHub Packages.
- Make sure npm is authenticated for GitHub Packages:

```sh
npm whoami --registry=https://npm.pkg.github.com
```

If auth has expired, re-authenticate with a GitHub token that can publish packages.

## Publish A Package

Use npm workspaces from the repo root. Replace the workspace name with the package you are publishing.

```sh
PACKAGE_DIR=packages/terra-draw-maplibre-gl-adapter
PACKAGE=$(node -p "require('./$PACKAGE_DIR/package.json').name")
VERSION=$(node -p "require('./$PACKAGE_DIR/package.json').version")

npm view "$PACKAGE@$VERSION" version --registry=https://npm.pkg.github.com
npm run build --workspace="$PACKAGE"
npm publish --workspace="$PACKAGE" --dry-run --registry=https://npm.pkg.github.com
npm publish --workspace="$PACKAGE" --registry=https://npm.pkg.github.com
npm view "$PACKAGE" version --registry=https://npm.pkg.github.com
```

If `npm view` before publishing returns a version, stop: that version is already published.

## MapLibre Adapter Example

For the MapLibre adapter:

```sh
npm whoami --registry=https://npm.pkg.github.com
npm run build --workspace=@blocktype-co-uk/terra-draw-maplibre-gl-adapter
npm publish --workspace=@blocktype-co-uk/terra-draw-maplibre-gl-adapter --dry-run --registry=https://npm.pkg.github.com
npm publish --workspace=@blocktype-co-uk/terra-draw-maplibre-gl-adapter --registry=https://npm.pkg.github.com
npm view @blocktype-co-uk/terra-draw-maplibre-gl-adapter version --registry=https://npm.pkg.github.com
```

## Consuming In Blocktype

After publishing, update Blocktype to the new version:

```sh
npm install @blocktype-co-uk/terra-draw-maplibre-gl-adapter@<version> --package-lock-only
```

If a clean worktree does not have `node_modules` installed and `postinstall` fails because `patch-package` is unavailable, regenerate the lockfile with scripts disabled:

```sh
npm install @blocktype-co-uk/terra-draw-maplibre-gl-adapter@<version> --package-lock-only --ignore-scripts
```

Keep `package.json` pinned to the exact package version if that is the existing style in Blocktype.
