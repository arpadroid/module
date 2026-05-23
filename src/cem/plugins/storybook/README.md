# Storybook CEM Adapter

Runtime utilities that read the Custom Elements Manifest and enrich Storybook argTypes. No build step required — all logic runs at story execution time.

## Integration

### 1. Load and process the manifest

Call `processCustomElementsManifest` once at startup (e.g. in `.storybook/preview.js`):

```js
import { processCustomElementsManifest } from '@arpadroid/module/src/cem/plugins/storybook/storybook-cem-adapter.js';
import manifest from '../dist/custom-elements.json' assert { type: 'json' };

processCustomElementsManifest(manifest);
```

This strips the `members` array from each declaration (reducing memory footprint) and stores the processed manifest on `globalThis.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__`.

### 2. Register the argTypes enhancer

Add `enhanceArgTypesFromCem` to the `argTypesEnhancers` array in `.storybook/preview.js`:

```js
import { enhanceArgTypesFromCem } from '@arpadroid/module/src/cem/plugins/storybook/storybook-cem-adapter.js';

export default {
    argTypesEnhancers: [enhanceArgTypesFromCem]
};
```

The enhancer matches the story's `component` tag name against the manifest and applies all pipeline transforms described below.

### 3. Normalize array args (optional)

When using array controls, call `normalizeArrayArgs` in a decorator or loader to convert comma-separated text input back to arrays before the story renders:

```js
import { normalizeArrayArgs } from '@arpadroid/module/src/cem/plugins/storybook/storybook-cem-adapter.js';

// Inside a decorator:
args = normalizeArrayArgs(args, argTypes);
```

## Enhancer Pipeline

`enhanceArgTypesFromCem` runs five pure enhancers in sequence. Each receives a resolved context object and returns a new `argTypes` record. The manifest declaration and its attribute map are resolved once and shared across all enhancers via the context.

| # | Enhancer | What it does |
|---|----------|--------------|
| 1 | `enhanceInheritedAttributeArgTypes` | Assigns `table.category` (`Attributes` / `Inherited Attributes`) and `table.subcategory` (ancestor class name) based on the manifest `inheritedFrom` field. Also reorders argTypes to match manifest attribute order. **Must run first.** |
| 2 | `enhanceExpandedTypeDetails` | When a ConfigType property carries a resolved `detail` (expanded type alias), sets `type.name` to the detail and populates `table.type.summary` / `table.type.detail` so Storybook shows the alias in the summary and the expansion on hover. |
| 3 | `enhanceArgTypeDescriptions` | Removes synthetic CEM fallback descriptions of the form `TS type: <type>` that duplicate the type column. |
| 4 | `enhanceLiteralUnionArgTypes` | Converts string-literal union types (e.g. `'primary' \| 'secondary'`) into Storybook `select` controls with `options`. |
| 5 | `enhanceArrayArgTypes` | Converts array types into appropriate controls: string-literal element unions become `check` groups; open-ended arrays become `text` inputs with a comma-separated input hint. Sets `__arpadroidArrayControl` for use by `normalizeArrayArgs`. |

## Exported API

| Export | Description |
|--------|-------------|
| `enhanceArgTypesFromCem(context)` | Main argTypes enhancer. Register as a Storybook `argTypesEnhancer`. |
| `processCustomElementsManifest(manifest)` | Strips `members` from declarations and stores the manifest in `globalThis`. Call once at startup. |
| `normalizeArrayArgs(args, argTypes)` | Converts comma-separated text values back to arrays for argTypes that use the text array control. |
| `normalizeCommaSeparatedArrayValue(value)` | Low-level normalizer for a single value — splits on commas and trims each part. |
