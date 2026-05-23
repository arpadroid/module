# Custom Elements Manifest (CEM)

This directory contains the tooling used to generate and consume the [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) for Arpadroid components.

## Overview

The CEM subsystem has two distinct phases:

| Phase | Location | When |
|-------|----------|------|
| **Build-time** | `plugins/arpadroid/` | During `npm run build:manifest` — runs the CEM analyzer over all source files |
| **Runtime** | `plugins/storybook/` | At Storybook startup — reads the generated manifest and enriches argTypes |

## Files

| File | Purpose |
|------|---------|
| `custom-elements-manifest.config.js` | CEM analyzer configuration — globs, excludes, output path, and plugin registration |
| `types.ts` | Shared TypeScript types used across the CEM plugin utilities |
| `plugins/` | Build-time and runtime plugins |
| `sample/cem-sample-component-schema.json` | Reference CEM schema illustrating the expected manifest shape |

## The ConfigType Convention

Components declare their public configuration API in a sibling `.types.d.ts` file containing a `*ConfigType` type or interface:

```
my-element/
  my-element.js           — component source
  my-element.types.d.ts   — ConfigType declaration
```

The build-time plugin reads these files and injects their properties as `attributes` in the manifest. The Storybook adapter then uses those attributes to configure controls and categories.

## Data Flow

```
my-element.types.d.ts
       │
       │  analyzePhase / packageLinkPhase
       ▼
dist/custom-elements.json          ← generated CEM manifest
       │
       │  processCustomElementsManifest
       ▼
globalThis.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__
       │
       │  enhanceArgTypesFromCem
       ▼
Storybook argTypes controls
```
