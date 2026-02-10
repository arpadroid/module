<link rel="stylesheet" href="docs-styles.css">

# README - **_`@arpadroid/module`_**

![version](https://img.shields.io/badge/version-1.0.0-lightblue)
![node version](https://img.shields.io/badge/node-%3E%3D16.0.0-lightyellow)
![npm version](https://img.shields.io/badge/npm-%3E%3D8.0.0-pink)

>**_Links:_** 📖 [Build System](docs/BUILD.md) / [CLI](docs/CLI.md) / [API](API.md) | 📝[Changelog](docs/CHANGELOG.md) | 🤝 [Contributing](#contributing)

> A comprehensive build system and development toolkit for JavaScript/TypeScript projects in the Arpadroid ecosystem. This module provides unified configuration and tooling for Rollup, Storybook, TypeScript, Jest, ESLint, and more.



<!--**_Quick Links:_** [Installation](#-installation) | [Quick Start](#-quick-start) | [Configuration](#-configuration) | [File Outputs](#-file-outputs) | [Advanced Usage](#-advanced-usage) | [Dependencies](#-dependencies-included) | [Arpadroid Ecosystem](#-arpadroid-ecosystem)
-->

## ✨ Features

🏗️ **Unified Build System** - **Single configuration system** for all build tools with sensitive defaults.  
📦 **Rollup Integration** - **Optimized bundling** with **tree-shaking** and **minification**  
🧪 **Testing Suite** - **Jest/Storybook/Playwright** integration with **CI/CD support**  
📚 **Storybook Ready** - Component documentation and testing platform  
📝 **ESLint/TypeScript/JSDoc Support** - Code quality and style enforcement; automatic type compilation.  
🎨 **Style Bundling** - CSS/SCSS bundling and theme support via **@arpadroid/style-bun**  
🌍 **i18n Support** - Internationalization file bundling
📊 **Bundle Analysis** - Size analysis and visualization tools

<div id="installation"></div>

## 📦 Installation

```bash
npm install --save-dev @arpadroid/module
```

## 🚀 Quick Start

### 1. Create Project Structure

```
my-project
|
├── 📦 package.json
├── 🔷 tsconfig.json             # TypeScript config (opt)
│
└── 🗂️ src
    │
    ├── 🚀 index.js              # Main entry point
    ├── 🔷 types.d.ts            # TypeScript definitions (opt)
    ├── ⚙️ arpadroid.config.js   # Build config
    ├── 🌀 rollup.config.mjs     # Custom Rollup config (opt)
    |
    ├── 🌐 i18n (opt)
    │   ├── en.json
    │   └── es.json
    |
    ├── 🧩 components (opt)
    |    |
    │    └── 🧩 myComponent
    |         │
    │         ├── myComponent.js
    │         ├── myComponent.stories.js
    │         │
    |         ├── 🌐 i18n
    │         │   ├── myComponent.i18n.en.json
    │         │   └── myComponent.i18n.es.json
    │         │
    │         └── 🎨 styles
    │             ├── myComponent.default.css
    │             ├── myComponent.dark.css
    │             └── myComponent.my-custom-theme.scss
    |
    └── 🎨 themes (opt)
        │
        ├── 🧰 common
        │    ├── ⚙️ common.config.js (required)
        │    ├── _reset.css
        │    ├── variables/...
        │    └── mixins/...
        │
        ├── 🌞 default
        │    ├── ⚙️ default.config.js (required)
        │    ├── default.css
        │    └── styles/...
        │
        ├── 🌙 dark/...
        ├── 📱 mobile/...
        └── ✨ my-custom-theme/...


```

### 2. Add Scripts to package.json

```json
{
    "name": "@arpadroid/my-project",
    "main": "dist/arpadroid-my-project.js",
    "scripts": {
        "build": "arpadroid-build --minify",
        "dev": "arpadroid-build --storybook --watch",
        "test": "arpadroid-test --jest --storybook"
    }
}
```

See [`> CLI Reference`](docs/CLI.md) to learn how to configure the build via CLI flags.

### 3. Create a Config File:

For project-specific defaults, create a file at `src/arpadroid.config.js`, and add some configuration:

```javascript
export default {
    buildStyles: true,
    buildTypes: true,
    buildI18n: true,
    minify: false,
    buildType: 'uiComponent'
    // etc...
};
```

See [`> Build Reference`](docs/BUILD.md#buildconfigtype) for all configuration options.

Then your scripts become even simpler:

```json
"scripts": {
    "build": "arpadroid-build",
    "dev": "arpadroid-build --watch",
    "test": "arpadroid-test"
}
```

### 4. Build Your Project

```bash
npm run build
```

## ⚙️ Other Configurations


### Stylesheet Bundling:

[@todo]()

### Internationalization (i18n):

[@todo]()
### Storybook:

The module provides default Storybook configuration, but you can customize it:

```javascript
// .storybook/main.js (optional)
export default {
    extends: './node_modules/@arpadroid/module/src/storybook/main.ui.js'
    // Your customizations
};
```

[@todo]()

### Jest:

Default Jest configuration is provided, or customize with:

```javascript
// jest.config.mjs (optional)
export default {
    // Your Jest configuration
};
```

[@todo]()

## 🧑‍💻 Advanced Usage

For advanced scenarios, you can access the `Project` class directly, see [API Reference](docs/API.md#project-class).

## 📂 File Outputs

After building, your project will have:

```
dist/
├── arpadroid-my-project.js     # Main bundle
├── arpadroid-my-project.js.gz  # Gzipped bundle
├── @types/                     # TypeScript definitions
├── stats.html                  # Bundle analysis
├── themes/                     # Compiled styles (if any)
└── i18n/                       # Internationalization files
```

<!--
## 🔌 Integration Examples
### UI Component Library

```json
{
    "name": "@company/ui-library",
    "scripts": {
        "build": "arpadroid-build --minify",
        "dev": "npm run build -- --storybook --watch",
        "test": "arpadroid-test --jest --storybook"
    },
    "devDependencies": {
        "@arpadroid/module": "^1.0.0"
    }
}
```

### Application Project

```json
{
    "name": "@company/web-app",
    "scripts": {
        "build": "arpadroid-build --minify",
        "dev": "npm run build -- --watch",
        "test": "arpadroid-test --jest"
    }
}
```
-->

## 📚 Dependencies Included

The module bundles all necessary development dependencies:

### Build & Bundling

- **Rollup** - Module bundler with tree-shaking and plugins
- **Webpack** - Used internally by Storybook for component bundling
- **Babel** - JavaScript compilation and transpilation
- **TypeScript** - Type checking and compilation

### Testing & Quality

- **Jest** - Unit testing framework with coverage reports
- **Playwright** - End-to-end browser testing
- **ESLint** - Code quality and style enforcement with multiple plugins
- **Chromatic** - Visual regression testing for Storybook

### Development Tools

- **Storybook** - Component documentation and development platform
- **PM2** - Process manager for development servers
- **HTTP Server** - Local development server
- **Yargs** - Command line argument parsing
- **Chalk** - Terminal output styling and colors

### CSS Processing

- **SASS/SCSS & LESS** - CSS preprocessing and compilation
- **LightningCSS** - Fast CSS processing and minification (via style-bun)

### Utilities

- **Glob** - File pattern matching and selection
- **JSDoc** - Documentation generation from code comments
- **Lit** - Web components library support

## 🌟 Arpadroid Ecosystem

This module is the build foundation for the entire @arpadroid ecosystem of packages:

### Core Modules

- **@arpadroid/tools** - JavaScript utility library with object, node, and HTML helpers
- **@arpadroid/style-bun** - CSS/SCSS theme bundling and processing system

### UI & Component Libraries

- **@arpadroid/ui** - Core UI components and design system
- **@arpadroid/forms** - Advanced form components and validation
- **@arpadroid/lists** - Data list and table components
- **@arpadroid/navigation** - Navigation and routing components
- **@arpadroid/messages** - Notification and messaging components
- **@arpadroid/gallery** - Media gallery and image components

### Services & Infrastructure

- **@arpadroid/services** - Service layer and API utilities
- **@arpadroid/context** - State management and context providers
- **@arpadroid/resources** - Resource loading and management
- **@arpadroid/i18n** - Internationalization and localization

### Applications

- **@arpadroid/application** - Full application framework and starter templates

All @arpadroid modules use this build system for consistent development experience, testing, and deployment across the entire ecosystem.

<div id="contributing"></div>

## 🤝 Contributing

This project has specific architectural goals. If you'd like to contribute:

1. **[Open an issue](https://github.com/arpadroid/module/issues/new)** describing your proposal
2. Wait for maintainer feedback before coding
3. PRs without prior discussion may be closed

**[Bug reports](https://github.com/arpadroid/module/issues/new)** are always welcome!

## 📄 License

MIT License - see LICENSE file for details.
