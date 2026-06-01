# Migration Guide — `@blocktype-co-uk/terra-draw`

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
