<link rel="stylesheet" href="../docs-styles.css">

# ⬛ CLI Reference - **_`@arpadroid/module`_**

> Command-line interface for building and testing projects.

## 📦 `arpadroid-build`

**Build a project with optional watch mode and Storybook server.**

### Usage

```bash
arpadroid-build [options]
```

### Options

- **`--minify`, `-m`** — `boolean` (default: `false`)  
  Enable minification for production builds

- **`--watch`, `-w`** — `boolean` (default: `false`)  
  Enable watch mode for continuous rebuilding

- **`--storybook`, `-s`** — `number` (default: `undefined`)  
  Start Storybook server on specified port

- **`--slim`** — `boolean` (default: `false`)  
  Build without bundling dependencies (smaller bundle)

- **`--noTypes`** — `boolean` (default: `false`)  
  Skip TypeScript declaration file compilation

- **`--style-patterns`** — `string | string[]` (default: `undefined`)  
  CSS file patterns for style bundling (comma-separated if string)

- **`--deps`** — `string | string[]` (default: `undefined`)  
  Peer dependencies to build (comma-separated if string)


<br/>

## 🧪 `arpadroid-test`

**Run tests (Jest / Storybook / Playwright) for a project.**

### Usage

```bash
arpadroid-test [options]
```

### Options

- **`--name`, `-n`** — `string` (default: `undefined`)  
  Project name (auto-detected from current directory if omitted)

- **`--jest`, `-j`** — `boolean` (default: `false`)  
  Run Jest unit tests

- **`--storybook`, `-s`** — `boolean` (default: `false`)  
  Run Playwright/Storybook visual tests

- **`--ci`** — `boolean` (default: `false`)  
  CI mode (automatically manages Storybook server lifecycle)

- **`--watch`, `-w`** — `boolean` (default: `false`)  
  Watch mode for continuous testing

- **`--query`** — `string` (default: `''`)  
  Filter tests by pattern

- **`--browsers`, `-b`** — `string[]` (default: `['chromium']`)  
  Browsers for Playwright testing (`webkit`, `chromium`, `firefox`)

- **`--port`, `-p`** — `number` (default: `6006`)  
  Storybook server port


---
