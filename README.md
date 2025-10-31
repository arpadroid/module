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
⚡ **Development Server** - Watch mode with live reload  
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

| Option | Description | Example |
|--------|-------------|---------|
| `--project` | Project name (required) | `--project=ui` |
| `--minify` | Enable minification | `--minify` |
| `--watch` | Watch for file changes | `--watch` |
| `--storybook` | Start Storybook server | `--storybook=6001` |
| `--slim` | Build without dependencies | `--slim` |
| `--noTypes` | Skip TypeScript compilation | `--noTypes` |

## Testing Commands

### Run All Tests
```bash
npm run test
```

### Test Options

| Option | Description | Example |
|--------|-------------|---------|
| `--jest` | Run Jest unit tests | `--jest` |
| `--storybook` | Run Storybook visual tests | `--storybook` |
| `--ci` | CI mode (starts/stops servers) | `--ci` |
| `--watch` | Watch mode for tests | `--watch` |
| `--query` | Filter tests by pattern | `--query=button` |

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
  extends: './node_modules/@arpadroid/module/src/storybook/main.ui.js',
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

### Custom Build Configuration

```javascript
// Using the Project class directly
import { Project } from '@arpadroid/module';

const project = new Project('my-project');
await project.build({
  minify: true,
  buildTypes: true,
  buildStyles: true,
  watch: false
});
```

### Build Hooks

```javascript
// src/rollup.config.mjs
export default [
  {
    // Custom rollup configuration
    plugins: [
      // Your custom plugins
    ]
  }
];
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

- **Rollup** - Module bundler with plugins
- **Storybook** - Component documentation platform  
- **Jest** - Testing framework
- **TypeScript** - Type checking and compilation
- **ESLint** - Code quality tools
- **Babel** - JavaScript compilation
- **PostCSS** - CSS processing

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! This module is the foundation for all Arpadroid projects.