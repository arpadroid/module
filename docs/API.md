# 📚 API Reference - **_`@arpadroid/module`_**

> **Comprehensive API documentation for **`@arpadroid/module`** build system and development toolkit.**

> Links: [🏗️ Project Class](#project-class) &nbsp;| [🧪 ProjectTest Class](#project-test-class)

<div id="project-class"></div>

## 🏗️ Project Class

The Project class is responsible for orchestrating the build, watch, and test operations.
It is instantiated by the CLI command **`arpadroid-build`** (see [> CLI Reference](CLI.md)).
For more advanced scenarios, you can instantiate it programmatically in your own scripts as such:

```typescript
import { Project, BuildConfigType } from '@arpadroid/module';

const config: BuildConfigType = {
    buildStyles: true,
    buildTypes: true,
    buildI18n: true,
    minify: true,
    path: '/path/to/my/project',
    style_patterns: ['/path/to/styles/**/*.scss']
};

// Sample usage
const project = new Project('my-project', config);
await project.build();
```

---

### 🏗️ Constructor

- `name`: `string`  
  Project name (e.g., 'ui', 'forms'). Used to locate project directory and package

- `config`: `BuildConfigType | string`  
  Optional build configuration object

### 🛠️ Methods

- ```typescript
  addEntryTypesFile(): Promise<boolean>
  ```

    Creates a combined types.compiled.d.ts file from index and types files.

- ```typescript
  build(config: BuildConfigType): Promise<boolean>
  ```

    Performs a full build: cleans, builds deps, bundles styles/i18n, runs rollup & types, starts storybook/watch as configured.

- ```typescript
  buildDependencies(buildConfig: BuildConfigType): Promise<void>
  ```

    Builds dependent @arpadroid projects in sequence with slim mode enabled.

- ```typescript
  buildStyles(config?: BuildConfigType): void
  ```

    Compiles and combines dependency styles and copies UI assets when needed.

- ```typescript
  buildTheme(theme: string, files: string[]): void
  ```

    Concatenates CSS files into final theme outputs and writes them to dist/themes.

- ```typescript
  buildTypes(rollupConfig: RollupOptions[], config: BuildConfigType): Promise<boolean>
  ```

    Coordinates type compilation, declaration bundling and distribution when enabled.

- ```typescript
  bundleI18n(config: BuildConfigType): Promise<boolean>
  ```

    Compiles i18n assets using the external i18n compiler and stores resulting files on the instance.

- ```typescript
  bundleStyles(config?: BuildConfigType): Promise<ThemesBundler | boolean>
  ```

    Uses ThemesBundler to generate theme CSS bundles for the project.

- ```typescript
  compileTypeDeclarations(_config: BuildConfigType): Promise<boolean>
  ```

    Invokes tsc to emit declaration files (watch mode supported).

- ```typescript
  compileTypes(config?: CompileTypesType): Promise<unknown[]>
  ```

    Copies \*.types.d.ts files into a temp types directory preserving structure.

- ```typescript
  createDependencyInstances(): Project[]
  ```

    Creates Project instances for each dependency package.

- ```typescript
  distTypes(): Promise<void>
  ```

    Copies the compiled .tmp/.types directory into dist/@types.

- ```typescript
  getBuildConfig(_config?: Object): Promise<BuildConfigType>
  ```

    Merges file-level config with defaults and returns the effective build configuration.

- ```typescript
  getBuildSeconds(): string | false
  ```

    Returns the build duration in seconds formatted as a string.

- ```typescript
  getDefaultConfig(): BuildConfigType
  ```

    Returns the default build configuration used by the project.

- ```typescript
  getDependencies(sort?: string[]): string[]
  ```

    Returns the list of @arpadroid peerDependencies, optionally ordered by a provided sort array.

- ```typescript
  getFileConfig(): Promise<Object>
  ```

    Loads and returns the project's src/arpadroid.config.js configuration if present.

- ```typescript
  getInstallCmd(): string
  ```

    Returns the shell command used to install the project dependencies.

- ```typescript
  getModulePath(): string
  ```

    Returns the path to the @arpadroid/module package for this project (or the project path if it's the module itself).

- ```typescript
  getPackageJson(): Object | false
  ```

    Reads and returns the project's package.json if it exists.

- ```typescript
  getPath(): string
  ```

    Resolves the filesystem path for the project (local or in node_modules/@arpadroid/\*).

- ```typescript
  getScripts(): Object | undefined
  ```

    Returns the scripts section from the project's package.json.

- ```typescript
  getStorybookCmd(): Promise<string>
  ```

    Constructs the Storybook CLI command with the appropriate config path and port.

- ```typescript
  getStorybookConfigPath(): string
  ```

    Returns the project or fallback Storybook configuration directory path.

- ```typescript
  getThemes(): string[]
  ```

    Returns an array of theme directory names found under src/themes.

- ```typescript
  getThemesPath(): string
  ```

    Returns the path to the project's themes directory.

- ```typescript
  hasStyles(): boolean
  ```

    True if the project exposes themes under src/themes.

- ```typescript
  install(): Promise<boolean>
  ```

    Runs the install routine (removes node_modules, reinstalls and audits).

- ```typescript
  logBuild(config: BuildConfigType): void
  ```

    Emits build heading and task messages to the console based on config.

- ```typescript
  logBuildComplete(): void
  ```

    Logs a success message including total build time.

- ```typescript
  preProcessInput(input: InputOption): InputOption
  ```

    Converts a single input path to an absolute path within the project.

- ```typescript
  preProcessInputs(inputs: InputOption | InputOption[] | undefined): InputOption | InputOption[] | undefined
  ```

    Normalizes rollup input(s) by resolving project paths.

- ```typescript
  rollup(rollupConfig: RollupOptions[], config?: BuildConfigType, heading?: string): Promise<boolean>
  ```

    Runs Rollup builds for each provided configuration and writes outputs to dist.

    Runs a Rollup build to produce a single dist/types.d.ts declaration file.

- ```typescript
  setConfig(config: BuildConfigType): void
  ```

    Applies and merges the provided build configuration with defaults.

- ```typescript
  test(): Promise
  ```

    Runs the project's test suite using ProjectTest.

- ```typescript
  validate(): boolean
  ```

    Checks whether the project path exists and logs an error if not.

- ```typescript
  watch(rollupConfig: RollupOptions[], { watch = WATCH, slim }: { watch?: boolean, slim?: boolean }): void
  ```
    Starts Rollup watcher and handles watch events and errors.

<br/>

<div id="project-test-class"></div>

## 🧪 ProjectTest Class

> The ProjectTest class is responsible for orchestrating and running tests for a Project instance, including Node.js, Jest, and Storybook tests.
> <br/>
> It is used internally by the Project class through the `test` method, but can also be instantiated directly for advanced testing scenarios:

```typescript
import { Project, ProjectTest } from '@arpadroid/module';

const project = new Project('my-project');
const tester = new ProjectTest(project, { jest: true, storybook: true });
await tester.test();
```

### 🏗️ Constructor

- `project`: `Project`  
   Project instance to test (required)

- `config`: `ProjectTestConfigType`  
   Optional test configuration object

### 🛠️ Methods

- ```typescript
  getDefaultConfig(): ProjectTestConfigType
  ```

    Returns the default test configuration used by ProjectTest.

- ```typescript
  getJestConfigLocation(): string
  ```

    Returns the path to the Jest configuration file for the project.

- ```typescript
  isStorybookCIRunning(): boolean
  ```

    Checks if the Storybook CI server is running.

- ```typescript
  runTest(config?: ProjectTestConfigType): Promise<boolean | unknown>
  ```

    Runs the main test routine, orchestrating build and test execution.

- ```typescript
  setConfig(config: ProjectTestConfigType): void
  ```

    Applies and merges the provided test configuration with defaults.

- ```typescript
  startStorybookCI(): Promise<Buffer>
  ```

    Starts the Storybook server in CI mode.

- ```typescript
  stopStorybookCI(): Promise<Buffer>
  ```

    Stops the Storybook CI server if running.

- ```typescript
  test(config?: ProjectTestConfigType): Promise<object>
  ```

    Runs all configured tests (Node.js, Jest, Storybook) and returns a result object.

- ```typescript
  testJest(config: ProjectTestConfigType): Promise<Buffer | string>
  ```

    Runs Jest tests if configured.

- ```typescript
  testNodeJS(config: ProjectTestConfigType): Promise<boolean | unknown>
  ```

    Runs Node.js tests if present.

- ```typescript
  testStorybook(config?: ProjectTestConfigType): Promise<void>
  ```
    Runs Storybook tests if configured.

## 🚀 Advanced Usage

Complex use cases and integration patterns.

### Custom Rollup Plugin

Add a custom Rollup plugin to your build:

```javascript
// rollup.config.js
import { getBuild } from '@arpadroid/module';

function myCustomPlugin() {
    return {
        name: 'my-plugin',
        transform(code, id) {
            // Your transformation logic
            return code;
        }
    };
}

export default getBuild('my-project', {
    buildType: 'uiComponent',
    plugins: [myCustomPlugin()],
    minify: true
});
```

### Programmatic Testing

Run tests programmatically from Node.js:

```javascript
import Project from '@arpadroid/module';

const project = new Project('ui');

// Run tests
await project.test({
    jest: true,
    storybook: true,
    ci: true
});

console.log('All tests passed!');
```

### Environment-Specific Builds

Configure builds based on environment:

```javascript
// arpadroid.config.js
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

export default {
    buildStyles: true,
    buildTypes: !isDev, // Skip types in dev for faster builds
    buildI18n: isProd, // Only bundle i18n in production
    buildDeps: isProd,
    minify: isProd
};
```

---

## 📦 Package Exports

Available import paths from @arpadroid/module:

```javascript
// Main exports
import Project from '@arpadroid/module';
import { getBuild, isSlim } from '@arpadroid/module';

// Storybook utilities
import { getStorybookContext } from '@arpadroid/module/storybook/test';
import decorators from '@arpadroid/module/storybook/decorators';

// Configuration presets
import storybookMain from '@arpadroid/module/storybook/main';
import storybookPreview from '@arpadroid/module/storybook/preview';

// TypeScript types
import type { ProjectConfig } from '@arpadroid/module';
```
