# Arpadroid CEM Plugin

A [`@custom-elements-manifest/analyzer`](https://github.com/webcomponents/custom-elements-manifest/tree/main/packages/analyzer) plugin that extends the generated manifest with ConfigType-derived attribute metadata for all Arpadroid components.

## What It Does

1. **Detects custom element registration** — finds every `defineCustomElement('tag-name', ClassName)` call across all analyzed source files.
2. **Extracts ConfigType attributes** — locates the sibling `.types.d.ts` file for each class and reads the `*ConfigType` type or interface to produce attribute descriptors.
3. **Propagates inherited attributes** — walks the superclass chain across source files and merges ancestor ConfigType attributes into child declarations, setting `inheritedFrom` on each.

## Lifecycle Hooks

| Hook | Purpose |
|------|---------|
| `initialize` | Captures the TypeScript compiler API (`ts`) for use in `packageLinkPhase` |
| `analyzePhase` | Called per AST node. Detects `defineCustomElement` calls, records `className → filePath` in `classFileMap`, and injects own-class ConfigType attributes |
| `packageLinkPhase` | Called once after all modules are analyzed. Walks each declaration's superclass chain using the full manifest and `classFileMap` to merge ancestor attributes |

`moduleLinkPhase` is not used because it lacks access to the full manifest and the TypeScript compiler API.

## ConfigType Convention

Each component provides a sibling `.types.d.ts` file exporting a `*ConfigType` type or interface:

```typescript
// my-element.types.d.ts
export type MyElementConfigType = {
    /** Description shown in Storybook */
    label?: string;
    variant?: 'primary' | 'secondary';
};
```

The plugin resolves the type name from the registered class name (e.g. `MyElement` → `MyElementConfigType`). If no exact match is found it falls back to the first `*ConfigType` declaration in the file.

### Type Checker Mode

By default the plugin uses text-based TypeScript AST parsing. When `shouldUseTypesChecker()` returns `true`, it creates a full TypeScript `Program` to resolve type aliases across files (e.g. `TemplateContentMode[]` expands to `('add' | 'content' | ...)[]`). Programs are cached up to 16 entries.

## Utilities (`utils/`)

| File | Responsibility |
|------|----------------|
| `cem-utils.js` | Barrel re-export + `handleTagName` orchestration |
| `cem-source.utils.js` | Locates sibling `.types.d.ts` files and returns `AttributeDescriptorType[]`. Results are memoized (max 256 entries) to avoid redundant I/O across AST node visits |
| `cem-mutation.utils.js` | Mutates CEM declarations: `upsertDeclaration`, `handleAttributes`, `mergeInheritedAttributes` |
| `cem-parser.utils.js` | Text-based TypeScript AST parser for ConfigType extraction |
| `cem-types-checker.utils.js` | Type-checker-based parser that resolves type aliases. Exposes `clearProgramCache()` for test isolation |
| `cem-mapper.utils.js` | Maps `DescriptorType[]` → `AttributeDescriptorType[]`, infers types and serialization strategies |

## Attribute Descriptor Shape

```json
{
    "name": "variant",
    "type": {
        "text": "MyVariantAlias",
        "summary": "string",
        "detail": "'primary' | 'secondary'"
    },
    "serializedAs": "string",
    "description": "JSDoc comment from the ConfigType property",
    "optional": true,
    "inheritedFrom": { "name": "ParentClassName" }
}
```

`detail` is only present when a type alias was resolved to a more specific expansion. `inheritedFrom` is only present on attributes propagated from an ancestor class.

## Serialization Strategy

The `serializedAs` field is inferred from the TypeScript type text and indicates how the attribute is expected to be passed in HTML:

| Value | Meaning |
|-------|---------|
| `string` | Plain string attribute |
| `number` | Numeric attribute |
| `boolean-attr` | Boolean presence attribute |
| `json` | Serialized as JSON (arrays, objects, records) |
| `property-only` | Cannot be set via HTML attribute |

## Configuration

The plugin is registered in `custom-elements-manifest.config.js` at the root of this package. No options are accepted — behavior is controlled by the project-level `shouldUseTypesChecker()` helper.
