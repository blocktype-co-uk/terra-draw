# Agent instructions — blocktype-co-uk/terra-draw

This is a **maintained fork** of [`JamesLMilner/terra-draw`](https://github.com/JamesLMilner/terra-draw).
The upstream remote is named `upstream`. The two published packages are:

| Upstream name | Fork name |
|---|---|
| `terra-draw` | `@blocktype-co-uk/terra-draw` |
| `terra-draw-maplibre-gl-adapter` | `@blocktype-co-uk/terra-draw-maplibre-gl-adapter` |

All other packages in the monorepo keep upstream names and are not published.

Package manager: **npm** (package-lock.json, npm workspaces).

---

## Upstream sync recipe

Use this whenever the upstream has released a new version and the fork needs to catch up.

### 0 — Orient

```bash
git fetch upstream
git log --oneline upstream/main ^HEAD | wc -l   # commits behind
git log --oneline HEAD ^upstream/main           # fork-specific commits
```

Read `FORK_FEATURES.md` (below) for the canonical list of fork features that must survive.
Check `MIGRATION.md` for any breaking changes already documented for consumers.

---

### 1 — Write regression tests first (on current branch, before touching upstream)

For **each fork feature**, check whether a test already exercises it precisely.
If not, add one now. Tests must:

- Pass on the current codebase.
- Be specific enough to **fail** if the feature is accidentally dropped post-merge.
- Live in the package they test (e.g. `select.mode.spec.ts`, `terra-draw-maplibre-gl-adapter.spec.ts`).

Commit the tests before creating the merge branch so they are in git history separately
from conflict resolutions. Use a scoped commit: `test(<package>): …`.

---

### 2 — Stash, branch, merge

```bash
# Stash any uncommitted modifications (stash package-lock separately if needed)
git stash push -m "wip: pre-sync stash" -- $(git diff --name-only | grep -v package-lock.json)
git stash push -m "wip: package-lock" -- package-lock.json   # if package-lock is dirty

# Create a branch named after the upstream version
UPSTREAM_VERSION=$(git show upstream/main:packages/terra-draw/package.json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
git checkout -b "v${UPSTREAM_VERSION}"

git merge upstream/main
```

Expect conflicts. List them at any time:
```bash
git diff --name-only --diff-filter=U
```

---

### 3 — Conflict resolution rules (in priority order)

**Rule 1: Package identity — always fork wins**
- `packages/terra-draw/package.json` → `"name": "@blocktype-co-uk/terra-draw"`
- `packages/terra-draw-maplibre-gl-adapter/package.json` → `"name": "@blocktype-co-uk/terra-draw-maplibre-gl-adapter"`, `peerDependencies` uses `"@blocktype-co-uk/terra-draw": "^1.0.0"`
- Import paths in `terra-draw-maplibre-gl-adapter/src/` → `from "@blocktype-co-uk/terra-draw"`

**Rule 2: package-lock.json — always take upstream, then reconcile**
```bash
git checkout --theirs -- package-lock.json
git add package-lock.json
# after merge is committed:
npm install   # regenerates lock with fork's scoped package entries added back
```

**Rule 3: Fork feature files — take upstream as base, restore fork additions**
For each file that contains a fork feature, accept upstream's version wholesale,
then surgically restore fork-specific fields/methods/logic on top.
Never try to keep the fork's old structure and apply upstream patches to it —
upstream refactors will make this fragile.

**Rule 4: Shared types (e.g. `common.ts`) — merge both sides**
Add upstream's new union members / exported types AND restore fork-specific additions
(e.g. `"default"` in `SetCursor`).

**Rule 5: Build tooling, Storybook, CI — upstream wins**
The fork makes no custom build config changes. Accept upstream wholesale.

**Rule 6: Test files — keep both sides' tests**
Never drop upstream tests; add fork's tests on top.

---

### 4 — Complete the merge

```bash
GIT_EDITOR=true git merge --continue   # auto-accepts merge commit message
```

If the commit hook rejects the message, use `--no-verify` only if the hook is a linter
(not a security check).

---

### 5 — Post-merge verification (run in order; fix before proceeding)

```bash
# 1. Install (picks up new deps, regenerates lock entries for scoped packages)
npm install

# 2. Build terra-draw first — ts-jest resolves types via dist/, not source
npm run build --workspace=packages/terra-draw

# 3. Type-check
npx tsc --noEmit

# 4. Unit tests
npm test

# 5. Build adapter
npm run build --workspace=packages/terra-draw-maplibre-gl-adapter

# 6. E2e — kill any stale process on port 3000 first, then:
cd packages/e2e
npx playwright install chromium   # only needed if Playwright version bumped
npm run build
npm test
cd ../..

# 7. Confirm scoped import is the only reference in fork packages
grep -r '"terra-draw"' packages/terra-draw-maplibre-gl-adapter/

# 8. Pop stash
git stash pop   # repeat if stashed separately
```

---

### 6 — Version bumps

Match upstream's version for the two fork packages to signal which upstream release
this is based on:

```bash
# Edit package.json versions directly, or use the release scripts:
cd packages/terra-draw && npm run release
cd ../../packages/terra-draw-maplibre-gl-adapter && npm run release
```

---

### 7 — Push

```bash
git push origin "v${UPSTREAM_VERSION}"
```

Open a PR from `v<version>` → `main` when ready to land.

---

### 8 — Opportunistic cleanup

After the merge passes, compare each fork feature against what upstream now ships.
If upstream implemented the equivalent (possibly under a different name), consider:

1. Removing the fork-specific code.
2. Adding a one-version backward-compat shim if consumers depend on the old API.
3. Documenting the rename in `MIGRATION.md`.
4. Removing the shim in the next cycle.

Keep `FORK_FEATURES.md` up to date.

---

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| ts-jest can't find new types (e.g. `markerUrl`) | dist/ is stale from before the merge | `npm run build --workspace=packages/terra-draw` |
| All e2e tests fail with timeout | Stale process occupying port 3000 | `kill $(lsof -ti :3000)` |
| Playwright tests fail with "Executable doesn't exist" | Playwright version bumped, browsers not re-downloaded | `npx playwright install chromium` (inside `packages/e2e`) |
| Merge commit rejected by commit hook | commitlint requires a scope | Use `fix(<package>): …` not bare `fix: …` |
| TS error: `Cannot find name 'X'` after merge | Fork added code referencing a variable that upstream renamed/removed in the same hunk | Re-read the surrounding upstream context; the variable moved |
| A `defaultCursors` entry silently swallows a fallback chain | A value in the defaults object was not meant to be a default | Remove from defaults; only apply when caller explicitly provides it |
| `git stash push` fails on package-lock.json | Lock file has its own merge state | Stash it separately with an explicit path |

---

## Fork features reference → `FORK_FEATURES.md`
