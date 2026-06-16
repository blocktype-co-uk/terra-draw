# Fork features

Canonical list of changes this fork makes relative to upstream `terra-draw`.
Keep this file current. Each item records **what**, **where**, and **why** —
enough for an agent to verify the feature survived a merge without reading the
full commit history.

---

## 1 — Scoped package names

| Package | Upstream name | Fork name |
|---|---|---|
| Core library | `terra-draw` | `@blocktype-co-uk/terra-draw` |
| MapLibre adapter | `terra-draw-maplibre-gl-adapter` | `@blocktype-co-uk/terra-draw-maplibre-gl-adapter` |

**Files:** both `package.json` files + import in `terra-draw-maplibre-gl-adapter/src/terra-draw-maplibre-gl-adapter.ts`.

---

## 2 — Lazy-snapshot draggability (MapLibre adapter)

**What:** `setDraggability(false)` captures the current state of `dragPan` and
`dragRotate` **at the moment it is first called**, not at adapter construction time.

**How:** Three fields — `_initialDragPan`, `_initialDragRotate`, `_isManagingDrag` —
are `undefined` until the first `setDraggability(false)` call. Upstream initialises
them eagerly in the constructor.

**Why:** If external code changes drag state between map construction and the user
starting to draw (common in apps that conditionally disable panning), the eager
snapshot captures the wrong state and `setDraggability(true)` will incorrectly
re-enable dragging.

**Files:** `packages/terra-draw-maplibre-gl-adapter/src/terra-draw-maplibre-gl-adapter.ts`
**Upstream state:** Upstream snapshots eagerly in constructor (lines ~37–38 of upstream's file).

---

## 3 — Per-layer render ordering (MapLibre adapter)

**What:** The MapLibre adapter accepts three independent `renderBelowLayerId`
options — one per geometry type — instead of upstream's single field that moves
all layers together.

**Options:**
- `renderPolygonsBelowLayerId`
- `renderPointsBelowLayerId`
- `renderLinesBelowLayerId`

All three fall back to `renderBelowLayerId` if not specified (backward compat with
upstream's API).

**Why:** Allows rendering polygons below a label layer while keeping points above it,
for example.

**Files:** `packages/terra-draw-maplibre-gl-adapter/src/terra-draw-maplibre-gl-adapter.ts`
**Upstream state:** Single `_renderBeforeLayerId` field moves all layers together.

---

## 4 — `pointerDistance / 2` click threshold (select mode)

**What:** Vertex drag-start fires only when the pointer is within
`pointerDistance / 2` pixels of a vertex, not the full `pointerDistance`.

**How:** Division applied in `getClosestCoordinate()` inside
`drag-coordinate.behavior.ts`.

**Why:** `pointerDistance` controls both the visual radius of the selection handle
and the hit area. Halving the hit area makes the effective click zone match the
visible handle size rather than extending invisibly beyond it.

**Files:** `packages/terra-draw/src/modes/select/behaviors/drag-coordinate.behavior.ts`
**Upstream state:** Uses full `pointerDistance` as threshold.

---

## 5 — Configurable `zIndex` styling (polygon, linestring, select modes)

**What:** Each mode's styling interface exposes a `zIndex: NumericStyling` property
so callers can control draw-layer stacking order.

**Why:** Required to implement per-feature render ordering in host applications
(e.g. always render the selected polygon on top).

**Files:**
- `packages/terra-draw/src/modes/polygon/polygon.mode.ts`
- `packages/terra-draw/src/modes/linestring/linestring.mode.ts`
- `packages/terra-draw/src/modes/select/select.mode.ts`

**Upstream state:** `zIndex` is hardcoded to `Z_INDEX.*` constants; not exposed in
the styling interface.

---

## 6 — `onCursorChange` callback (MapLibre adapter)

**What:** The MapLibre adapter accepts an optional `onCursorChange` callback. When
provided, `setCursor` forwards every cursor intent (including `"unset"`) to the
callback and does **not** mutate `map.getCanvas().style.cursor`. When omitted, the
adapter falls back to upstream's DOM-mutating behaviour (`canvas.style.cursor = …`
and `removeProperty("cursor")` on `"unset"`).

**Option:**
- `onCursorChange?: (cursor: Parameters<SetCursor>[0]) => void`

**Why:** Terra Draw manages cursor state for its own purposes (e.g. changing the
cursor over a coordinate) by writing directly to the canvas, which clobbers any
cursor management the host application performs outside Terra Draw. The callback
lets the host treat Terra Draw's cursor changes as *intents* and resolve the final
cursor through a single source of truth (e.g. a React `cursor` prop / priority
stack) while preserving Terra Draw's cursor affordances.

**Files:** `packages/terra-draw-maplibre-gl-adapter/src/terra-draw-maplibre-gl-adapter.ts`
**Upstream state:** No callback — `setCursor` always mutates the canvas directly.

**Removed fork feature:** A prior fork-only `_initialCursor` preservation on
`"unset"` was dropped in v1.5.0 — it was a partial fix that did not work reliably
when the host managed cursor state outside Terra Draw. Use `onCursorChange` instead.

**Removed fork feature:** `"default"` in the `SetCursor` union was dropped — it
existed only so consumers could configure mode cursors (e.g.
`pointerOverCoordinate: 'default'`) as a workaround for cursor clobbering. With
`onCursorChange`, Terra Draw emits `"unset"` and the host resolves its own
fallback cursor.
