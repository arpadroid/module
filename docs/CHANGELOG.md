# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-12-21

### 🎉 Initial Development Release

First pre-release version of @arpadroid/module - a comprehensive build system and development toolkit for JavaScript/TypeScript projects.

> **⚠️ Pre-Release Notice:** This is an early development version (0.0.x). APIs may change before reaching 1.0.0 stable release.

### ✨ Features

- **Unified Rollup Configuration** - Pre-configured Rollup bundling with intelligent defaults for UI libraries and general JavaScript packages
- **Storybook Integration** - Complete Storybook setup with custom decorators, layouts, and preview configurations
- **Jest Testing** - Ready-to-use Jest configuration with coverage reporting and ES module support
- **Playwright Testing** - Visual regression testing for Storybook components with Chromatic integration
- **ESLint Configuration** - Comprehensive ESLint setup with 12+ plugins for code quality and consistency
- **TypeScript Support** - Automated TypeScript declaration file generation and compilation
- **CSS/SCSS Bundling** - Theme bundling via @arpadroid/style-bun integration
- **i18n Bundling** - Internationalization file compilation and bundling
- **CLI Tools** - `arpadroid-build` and `arpadroid-test` commands for project management
- **Watch Mode** - Development mode with automatic rebuilding on file changes
- **Performance Tracking** - Built-in timing and performance metrics for build operations
- **Dependency Management** - Smart peer dependency building and resolution
- **Framework Agnostic** - Works with any web framework or vanilla JavaScript

### 🏗️ Core Architecture

- **Project Class** - Main orchestrator managing build, test, and watch operations
- **Modular Build System** - Separate modules for Rollup builds, TypeScript compilation, style bundling, and i18n processing
- **Plugin System** - Extensible Rollup plugin configuration (terser, babel, typescript, visualizer, etc.)
- **Configuration Options** - Optional `arpadroid.config.js` for project-specific customization
- **Terminal Logger** - Colored console output with task tracking and timing
- **Test Orchestration** - Unified interface for Jest, Playwright, and Storybook testing

### 📦 Dependencies

- **Build Tools:** Rollup, Webpack, Babel, TypeScript
- **Testing:** Jest, Playwright, Storybook 8.x, Chromatic
- **Linting:** ESLint with plugins for import, jsdoc, prettier, promise, security, and more
- **CSS Processing:** SASS/SCSS, LESS, LightningCSS
- **Utilities:** Yargs (CLI), Chalk (colors), Glob (patterns), PM2 (process management)

### 🎯 Project Structure

- **Build System:** `src/projectBuilder/` - Project and ProjectTest classes
- **Rollup Configuration:** `src/rollup/` - Build configurations and custom plugins
- **Storybook Setup:** `src/storybook/` - Main config, preview, decorators, layouts
- **Jest Configuration:** `src/jest/` - Test configuration presets
- **ESLint Configuration:** `src/eslint/` - Linting rules and presets
- **TypeScript Configuration:** `src/tsconfig/` - TypeScript compiler options
- **Utilities:** `src/utils/` - Object utilities and terminal logger
- **CLI Scripts:** `scripts/` - Command-line entry points

### 🔗 Integration with @arpadroid Ecosystem

This module serves as the build foundation for all @arpadroid packages:

- **Style System:** `@arpadroid/style-bun` (peer dependency for CSS bundling)
- **Infrastructure:** `@arpadroid/tools`, `@arpadroid/i18n`, `@arpadroid/services`
- **UI Components:** `@arpadroid/ui`, `@arpadroid/lists`, `@arpadroid/navigation`, `@arpadroid/forms`, `@arpadroid/gallery`, `@arpadroid/messages`
- **Application Framework:** `@arpadroid/application`

### 🚀 Next Steps Toward 1.0.0

- API stabilization and documentation refinement
- Performance optimization for large projects
- Enhanced error messages and debugging tools
- Extended configuration examples and recipes
- Community feedback integration
- Comprehensive test coverage
