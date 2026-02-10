# 🛠️ Build System Reference - **_`@arpadroid/module`_**

> **_Links:_** &nbsp;&nbsp; [🛠️ Build System](#build-system) &nbsp;|&nbsp;
> [⚙️ Build Configuration](#buildconfigtype) &nbsp;|&nbsp;
> [📤 Build Interface](#buildinterface)

> **_Resources:_** &nbsp;&nbsp; 📖 [CLI](CLI.md) / [API](API.md) &nbsp;|&nbsp; 📝[Changelog](CHANGELOG.md) &nbsp;|&nbsp; 🤝 [Contributing](../README.md#contributing)

## ✨ Features

- **Modular Rollup configuration** with multiple build targets;
- **Dependency bundling** with automatic peer dependency handling;
- **i18n** & **CSS/SCSS bundling** and **theming support**;
- **Storybook** / **Jest** / **Playwright** integrations;
- Pre-defined **Eslint** and **Typescript** configurations.
- **Fully customizable** via the provided options.

<br/>

<div id="build-system"></div>

## 🛠️ Build System

The build is invoked via the **`arpadroid-build`** CLI command (see [> CLI Reference](CLI.md)).
<br/>It can also be used programmatically via the **Project Class** (see [> API Reference](API.md)).

### 1. **`package.json`**

We invoke the build via npm scripts in `package.json` :

```json
"scripts": {
    "build": "arpadroid-build --minify",
    "build:dev": "arpadroid-build --storybook --watch"
}
```

As you see above, the build can be configured up to an extent via CLI flags (see [> CLI Reference](CLI.md)).

### 2. **`src/arpadroid.config.js`** :

We need a configuration file in order to define defaults, as it is not practical or possible, to pass every configuration option via CLI flags :

```javascript
export default {
    minify: true,
    buildTypes: true,
    buildI18n: true,
    buildStyles: true,
    deps: ['tools', 'signals']
    external: ['lodash'],
    path: '/path/to/my/project',
    storybook: {
        previewHead: head => html`
            ${head}
            <link rel="stylesheet" href="../src/themes/dark.css" />
        `,
        previewBody: body => html`
            ${body}
            <div id="custom-root"></div>
        `,
        preview: {
            options: {
                theme: 'dark'
            }
        }
    }
};
```

### 3. **`src/rollup.config.js`** :

The build system uses `Rollup` and exposes the `getBuild()` function to get the build configuration programmatically and fully customize if needed. Although this file is optional, it is useful for advanced use-cases.

#### **Function:** `getBuild(projectName, buildType, config)`

- **Parameters:**
    - **`projectName`** — `string` (default: `undefined`)  
      Name of the project (e.g., 'ui', 'forms', 'tools')

    - **`buildType`** — `'uiComponent' | 'library'` (default: `undefined`)  
      `'uiComponent'` for UI component libraries, `'library'` for general JavaScript packages

    - **`config`** — `BuildConfigType` (default: `{}`)  
      Build configuration options to override defaults

- **Returns:** &nbsp; [`BuildInterface`](#buildinterface)

##### **Example of `src/rollup.config.js`:**

```javascript
import { getBuild } from '@arpadroid/module';
import myPlugin from './plugins/my-plugin.js';

const { build } = getBuild('forms', {
    /**
     * We can also override default config options here.
     * The order of precedence is:
     * 1. CLI flags
     * 2. rollup.config.js
     * 3. arpadroid.config.js
     */
    minify: true,
    buildType: 'uiComponent',
    buildTypes: true,
    plugins: [...plugins, myPlugin()],
    external: ['lodash'],
    aliases: ['ui', 'tools'],
    processBuilds: builds => {
        // Modify builds array before execution
        builds.push(customBuild);
    }
});

export default build;
```

<br/>
<div id="buildconfigtype"></div>

## ⚙️ Build Configuration

**Type:** `BuildConfigType`

**Properties**

- **`aliases`** — `string[]` (default: `undefined`)  
  Module path aliases for resolution

- **`buildDeps`** — `boolean` (default: `true`)  
  Whether to build peer dependencies

- **`buildI18n`** — `boolean` (default: `true`)  
  Whether to bundle internationalization files

- **`buildJS`** — `boolean` (default: `true`)  
  Whether to build JavaScript/TypeScript files

- **`buildStyles`** — `boolean` (default: `true`)  
  Whether to bundle CSS/SCSS themes

- **`buildTypes`** — `boolean` (default: `false`)  
  Whether to compile TypeScript declaration files

- **`deps`** — `string[]` (default: `undefined`)  
  List of dependencies to build

- **`external`** — `string[]` (default: `undefined`)  
  External dependencies to exclude from bundle

- **`file`** — `string` (default: `undefined`)  
  Output file path

- **`isDependency`** — `boolean` (default: `undefined`)  
  Whether this project is being built as a dependency

- **`logHeading`** — `boolean` (default: `true`)  
  Whether to display build heading in console

- **`logo`** — `string` (default: `undefined`)  
  Custom ASCII art logo to display

- **`minify`** — `boolean` (default: `false`)  
  Whether to minify output for production

- **`parent`** — `string` (default: `undefined`)  
  Parent project name (for nested builds)

- **`path`** — `string` (default: `undefined`)  
  Custom project path (auto-detected if not provided)

- **`plugins`** — `Plugin[]` (default: `undefined`)  
  Additional Rollup plugins to include

- **`processBuilds`** — `(builds: RollupOptions[]) => void` (default: `undefined`)  
  Callback to process/modify build configurations before execution

- **`production`** — `boolean` (default: `false`)  
  Production mode flag (computed from environment)

- **`slim`** — `boolean` (default: `false`)  
  Use minimal plugin set (no dependencies bundled)

- **`storybook`** — `StorybookConfigType` (default: `undefined`)  
  Storybook configuration with preview options

- **`style_patterns`** — `string | string[]` (default: `undefined`)  
  Additional glob patterns for finding CSS/SCSS theme files

- **`watch`** — `boolean` (default: `false`)  
  Enable watch mode for continuous rebuilding

<br/>

<div id="buildinterface"></div>

## 📤 Build Interface

**Type:** `BuildInterface`

`getBuild()` returns an object of type `BuildInterface`, which can be used programmatically to fully customize the build process:

- **`build`** — `RollupOptions[]`  
  Array of Rollup configuration objects ready to export

- **`appBuild`** — `RollupOptions`  
  Main application build configuration

- **`typesBuild`** — `RollupOptions`  
  TypeScript declaration files build configuration

- **`project`** — `Project`  
  Project instance with build utilities and metadata

- **`buildConfig`** — `BuildConfigType`  
  Merged build configuration with defaults applied

- **`plugins`** — `InputPluginOption`  
  Array of Rollup plugins used in the build

- **`output`** — `OutputOptions | OutputOptions[] | undefined`  
  Rollup output configuration

- **`Plugins`** — `object`  
  Object with references to all available plugins: `bundleStats`, `gzipPlugin`, `dts`, `multiEntry`, `nodeResolve`, `json`, `peerDepsExternal`, `alias`, `watch`, `terser`, `copy`, `visualizer`, `typescript`, `debugPlugin`
