# Arpadroid Module

A comprehensive build system and development toolkit for JavaScript/TypeScript projects in the Arpadroid ecosystem. This module provides unified configuration and tooling for Rollup, Storybook, TypeScript, Jest, ESLint, and more.

## Features

🏗️ **Unified Build System** - Single configuration for all build tools  
📦 **Rollup Integration** - Optimized bundling with tree-shaking and minification  
📚 **Storybook Ready** - Component documentation and testing platform  
🧪 **Testing Suite** - Jest/Storybook/Playwright integration with CI/CD support  
📝 **TypeScript Support** - Automatic type generation and compilation  
🎨 **Style Bundling** - CSS/SCSS processing and optimization  
🌍 **i18n Support** - Internationalization file bundling  
🔧 **ESLint Integration** - Code quality and style enforcement  
📊 **Bundle Analysis** - Size analysis and visualization tools

## Installation

```bash
npm install --save-dev @arpadroid/module
```

## Quick Start

### 1. Add Scripts to package.json

```json
{
    "name": "@arpadroid/my-project",
    "scripts": {
        "build": "arpadroid-build --minify",
        "dev": "arpadroid-build --storybook=6001 --watch",
        "test": "arpadroid-test --jest --storybook --port=6001"
    }
}
```

### 2. (Optional) Create Config File

For project-specific defaults, create `src/arpadroid.config.js`:

```javascript
export default {
    buildStyles: true,
    buildTypes: true,
    minify: true
};
```

Then your scripts become even simpler:

```json
{
    "scripts": {
        "build": "arpadroid-build",
        "dev": "arpadroid-build --watch",
        "test": "arpadroid-test"
    }
}
```

### 3. Create Project Structure

```
my-project/
├── src/
│   ├── index.js              # Main entry point
│   ├── components/           # Your components
│   ├── themes/              # Style files (optional)
│   ├── i18n/                # Translation files (optional)
│   └── arpadroid.config.js  # Build config (optional)
├── package.json
└── tsconfig.json            # TypeScript config (optional)
```

### 4. Build Your Project

```bash
npm run build
```

### cmd: **_arpadroid-build_** Options

| Option        | Description                            | Example            |
| ------------- | -------------------------------------- | ------------------ |
| `--project`   | Project name (optional, auto-detected) | `--project=ui`     |
| `--minify`    | Enable minification                    | `--minify`         |
| `--watch`     | Watch for file changes                 | `--watch`          |
| `--storybook` | Start Storybook server                 | `--storybook=6001` |
| `--slim`      | Build without dependencies             | `--slim`           |
| `--noTypes`   | Skip TypeScript compilation            | `--noTypes`        |

### cmd: **_arpadroid-test_** Options

| Option        | Description                            | Example          |
| ------------- | -------------------------------------- | ---------------- |
| `--project`   | Project name (optional, auto-detected) | `--project=ui`   |
| `--jest`      | Run Jest unit tests                    | `--jest`         |
| `--storybook` | Run Storybook visual tests             | `--storybook`    |
| `--ci`        | CI mode (starts/stops servers)         | `--ci`           |
| `--watch`     | Watch mode for tests                   | `--watch`        |
| `--query`     | Filter tests by pattern                | `--query=button` |

## Configuration

### arpadroid.config.js

Create `src/arpadroid.config.js` to set project defaults:

```javascript
export default {
    // Build options
    buildStyles: true,
    buildTypes: true,
    buildI18n: true,
    buildDeps: true,
    minify: true,

    // Storybook customization (optional)
    storybook: {
        previewHead: () => `<link rel="stylesheet" href="/custom.css" />`,
        previewBody: () => `<div id="custom-root"></div>`
    }
};
```

### Project Structure Requirements

```javascript
// src/index.js - Main entry point
export * from './components/myComponent.js';

// src/arpadroid.config.js - Build configuration (optional)
export default {
    buildStyles: true,
    minify: true
};

// src/rollup.config.mjs - Custom Rollup config (optional)
export default [
  // Custom rollup configurations
];

// tsconfig.json - TypeScript config (optional)
{
  "extends": "./node_modules/@arpadroid/module/src/tsconfig/tsconfig.json"
}
```

### Storybook Configuration

The module provides default Storybook configuration, but you can customize it:

```javascript
// .storybook/main.js (optional)
export default {
    extends: './node_modules/@arpadroid/module/src/storybook/main.ui.js'
    // Your customizations
};
```

### Jest Configuration

Default Jest configuration is provided, or customize with:

```javascript
// jest.config.mjs (optional)
export default {
    // Your Jest configuration
};
```

## Advanced Usage

### Build Hooks

```javascript
// src/rollup.config.mjs - Advanced build customization
import { getBuild } from '@arpadroid/module';
import { readFileSync } from 'fs';
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';

// Get the default build configuration
const { build, appBuild, Plugins } = getBuild('my-project', 'uiComponent', {
    buildStyles: true,
    buildTypes: true,
    minify: process.env.NODE_ENV === 'production'
});

// Extend the default plugins with custom functionality
appBuild.plugins = [
    ...appBuild.plugins,

    // Environment-specific replacements:
    replace({
        preventAssignment: true,
        values: {
            __VERSION__: JSON.stringify(process.env.npm_package_version)
            // Other replacements
        }
    }),

    // Copy static assets:
    Plugins.copy({
        targets: [
            {
                src: 'src/assets/*',
                dest: 'dist/assets/'
            }
        ]
    })
    // ...
];

// Custom external dependencies based on environment
if (process.env.NODE_ENV === 'development') {
    appBuild.external = [...appBuild.external, 'react-devtools', '@storybook/addon-devtools'];
}

// Override output configuration for specific builds
if (process.env.BUILD_TARGET === 'cdn') {
    appBuild.output = {
        ...appBuild.output
        // ...
    };
}

export default build;
```

For even more advanced scenarios, you can access the Project class directly:

```javascript
// scripts/custom-build.mjs
import { Project } from '@arpadroid/module';

const project = new Project('my-project');

// Custom pre-build tasks
await project.buildDependencies();
await project.bundleStyles({
    style_patterns: ['custom/**/*.scss', 'themes/**/*.css']
});

// Custom build with hooks
await project.build({
    minify: true,
    buildTypes: true,
    buildStyles: false, // We handled styles above

    // Custom build processing
    processBuilds: builds => {
        // Add custom build configurations
        builds.push({
            input: 'src/worker.js',
            output: {
                file: 'dist/worker.js',
                format: 'iife'
            },
            plugins: [
                /* worker-specific plugins */
            ]
        });
    }
});

// Custom post-build tasks
console.log('✅ Custom build completed');
```

## File Outputs

After building, your project will have:

```
dist/
├── arpadroid-my-project.js     # Main bundle
├── arpadroid-my-project.js.gz  # Gzipped bundle
├── @types/                     # TypeScript definitions
├── stats.html                  # Bundle analysis
└── i18n/                       # Internationalization files
```

## Integration Examples

### UI Component Library

```json
{
    "name": "@company/ui-library",
    "scripts": {
        "build": "arpadroid-build --minify",
        "dev": "npm run build -- --storybook=6001 --watch",
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

## Dependencies Included

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

## Arpadroid Ecosystem

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

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! This module is the foundation for all Arpadroid projects.
