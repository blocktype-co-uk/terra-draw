# Migration Guide — `@blocktype-co-uk/terra-draw`

## v1.5.0 (`@blocktype-co-uk/terra-draw-maplibre-gl-adapter`)

### Initial cursor preservation removed — use `onCursorChange`

The fork previously restored the canvas cursor that existed *before* Terra Draw's
first `setCursor` call when receiving `"unset"`. That behaviour was unreliable when
the host application managed cursor state outside Terra Draw (e.g. via a React
`cursor` prop).

**Before (fork v1.4.x, no `onCursorChange`):**

```ts
new TerraDrawMapLibreGLAdapter({ map });
// setCursor("unset") restored the pre-terra-draw canvas cursor
```

**After (v1.5.0+):**

```ts
new TerraDrawMapLibreGLAdapter({
  map,
  onCursorChange: (cursor) => {
    // Forward Terra Draw's cursor intents into your own cursor state
  },
});
```

When `onCursorChange` is omitted, `"unset"` now matches upstream: it calls
`removeProperty("cursor")` on the canvas rather than restoring a saved value.

### `"default"` removed from `SetCursor` / mode cursor options

The fork previously allowed `"default"` as a `SetCursor` value so mode cursor
options like `pointerOverCoordinate: 'default'` could suppress Terra Draw's
built-in cursor changes. That was another partial workaround for cursor clobbering.

**Before:**

```ts
new TerraDrawSelectMode({
  cursors: {
    pointerOverCoordinate: 'default',
    pointerOver: 'default',
  },
});
```

**After:**

Remove those overrides and use `onCursorChange` on the adapter instead. Terra Draw
will emit its natural cursor intents (`grab`, `pointer`, `move`, etc.) and
`"unset"` when the pointer leaves; your host cursor state resolves the final
cursor.

## v1.30.0

### `cursors.pointerOverSelectionPoint` renamed to `cursors.pointerOverCoordinate`

The `TerraDrawSelectMode` cursor option `pointerOverSelectionPoint` has been removed.
Use `pointerOverCoordinate` instead — this aligns with the name used in upstream
`terra-draw` since v1.16.

**Before:**

```ts
new TerraDrawSelectMode({
  cursors: {
    pointerOverSelectionPoint: "grab",
  },
});
```

**After:**

```ts
new TerraDrawSelectMode({
  cursors: {
    pointerOverCoordinate: "grab",
  },
});
```

`pointerOverCoordinate` activates whenever the pointer is within `pointerDistance / 2`
pixels of any draggable vertex (selection points on the selected feature). The behaviour
is identical to the old option.
