# CEM Plugins

Two plugins serve different phases of the CEM pipeline:

| Directory | Phase | Role |
|-----------|-------|------|
| `arpadroid/` | Build-time | CEM analyzer plugin — generates `dist/custom-elements.json` |
| `storybook/` | Runtime | Storybook adapter — reads the manifest and enriches argTypes |

Both are loosely coupled: the build plugin writes the manifest; the Storybook adapter reads whatever manifest is loaded at runtime via `processCustomElementsManifest`. They share no code.
