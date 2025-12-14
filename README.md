# Arpadroid Module

A comprehensive build system and development toolkit for JavaScript/TypeScript projects in the Arpadroid ecosystem. This module provides unified configuration and tooling for Rollup, Storybook, TypeScript, Jest, ESLint, and more.

## Features

🏗️ **Unified Build System** - Single configuration for all build tools  
📦 **Rollup Integration** - Optimized bundling with tree-shaking and minification  
📚 **Storybook Ready** - Component documentation and testing platform  
🧪 **Testing Suite** - Jest integration with CI/CD support  
📝 **TypeScript Support** - Automatic type generation and compilation  
🎨 **Style Bundling** - CSS/SCSS processing and optimization  
🌍 **i18n Support** - Internationalization file bundling  
🔧 **ESLint Integration** - Code quality and style enforcement  
📊 **Bundle Analysis** - Size analysis and visualization tools

## What It Does

### 📦 **Build Pipeline**

1. **Dependency Building** - Builds project dependencies in correct order
2. **Style Bundling** - Processes CSS/SCSS files with optimization
3. **i18n Bundling** - Combines translation files
4. **JavaScript Bundling** - Rollup-based bundling with:
    - Tree-shaking for optimal bundle size
    - Minification and compression
    - Source map generation
    - Multiple output formats (ESM, UMD)
5. **TypeScript Compilation** - Generates type definitions
6. **Bundle Analysis** - Creates size reports and visualizations

### 🧪 **Testing Framework**

- **Jest Integration** - Unit and integration tests
- **Storybook Testing** - Visual regression and component testing
- **CI/CD Support** - Automated testing in continuous integration
- **Coverage Reports** - Code coverage analysis

### 🔧 **Development Experience**

- **Watch Mode** - Automatic rebuilding on file changes
- **Hot Reload** - Live updates during development
- **Storybook Integration** - Component documentation and playground
- **Error Reporting** - Clear build and test error messages
- **Performance Monitoring** - Build time optimization

## Installation

```bash
npm install --save-dev @arpadroid/module
```


## Quick Start

### 1. Add Scripts to package.json

```json
{
    "scripts": {
        "build": "node ./node_modules/@arpadroid/module/scripts/build-project.mjs --project=my-project --minify",
        "dev": "npm run build -- --storybook=6001 --watch",
        "test": "node ./node_modules/@arpadroid/module/scripts/test-project.mjs --project=my-project --jest --storybook",
        "storybook": "npm run build -- --storybook=6001 --watch"
    }
}
```

### 2. Create Project Structure

```
my-project/
├── src/
│   ├── index.js              # Main entry point
│   ├── components/           # Your components
│   ├── themes/              # Style files (optional)
│   └── i18n/                # Translation files (optional)
├── package.json
└── tsconfig.json            # TypeScript config (optional)
```

### 3. Build Your Project

```bash
npm run build
```

## Build Commands

### Basic Build

```bash
# Build with minification
npm run build

# Build without minification
node ./node_modules/@arpadroid/module/scripts/build-project.mjs --project=my-project
```

### Development Mode

```bash
# Watch mode with Storybook
npm run build -- --storybook=6001 --watch

# Watch mode without Storybook
npm run build -- --watch
```

### Build Options

| Option        | Description                 | Example            |
| ------------- | --------------------------- | ------------------ |
| `--project`   | Project name (required)     | `--project=ui`     |
| `--minify`    | Enable minification         | `--minify`         |
| `--watch`     | Watch for file changes      | `--watch`          |
| `--storybook` | Start Storybook server      | `--storybook=6001` |
| `--slim`      | Build without dependencies  | `--slim`           |
| `--noTypes`   | Skip TypeScript compilation | `--noTypes`        |

## Testing Commands

### Run All Tests

```bash
npm run test
```

### Test Options

| Option        | Description                    | Example          |
| ------------- | ------------------------------ | ---------------- |
| `--jest`      | Run Jest unit tests            | `--jest`         |
| `--storybook` | Run Storybook visual tests     | `--storybook`    |
| `--ci`        | CI mode (starts/stops servers) | `--ci`           |
| `--watch`     | Watch mode for tests           | `--watch`        |
| `--query`     | Filter tests by pattern        | `--query=button` |

## Configuration

### Project Structure Requirements

```javascript
// src/index.js - Main entry point
export * from './components/myComponent.js';

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
        "build": "node ./node_modules/@arpadroid/module/scripts/build-project.mjs --project=ui --minify",
        "dev": "npm run build -- --storybook=6001 --watch",
        "test": "node ./node_modules/@arpadroid/module/scripts/test-project.mjs --project=ui --jest --storybook"
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
        "build": "node ./node_modules/@arpadroid/module/scripts/build-project.mjs --project=app --minify",
        "dev": "npm run build -- --watch",
        "test": "node ./node_modules/@arpadroid/module/scripts/test-project.mjs --project=app --jest"
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
