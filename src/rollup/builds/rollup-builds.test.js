import {
    isSlim,
    shouldWatch,
    preProcessDependencies,
    getBuildConfig,
    getInput,
    getExternal,
    getBuild
} from './rollup-builds.mjs';
import Project from '../../project/project.mjs';
import path from 'path';

const TEST_PROJECT_PATH = path.join(process.cwd(), 'src/test/test-project');

describe('rollup-builds', () => {
    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Reset environment variables before each test
        delete process.env.arpadroid_slim;
        delete process.env.arpadroid_watch;
        delete process.env.ARPADROID_BUILD_CONFIG;
        delete process.env.deps;
        delete process.env.production;
    });

    afterEach(() => {
        // Restore original environment
        process.env = { ...originalEnv };
    });

    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('isSlim', () => {
        it('should return correct boolean based on env', () => {
            expect(isSlim()).toBe(false);

            process.env.arpadroid_slim = 'true';
            expect(isSlim()).toBe(true);

            process.env.arpadroid_slim = 'false';
            expect(isSlim()).toBe(false);
        });
    });

    describe('shouldWatch', () => {
        it('should return correct boolean based on env', () => {
            expect(shouldWatch()).toBe(false);

            process.env.arpadroid_watch = 'true';
            expect(shouldWatch()).toBe(true);
        });
    });

    describe('preProcessDependencies', () => {
        it('should handle string, array, and edge cases', () => {
            expect(preProcessDependencies('ui,tools,i18n')).toEqual(['ui', 'tools', 'i18n']);
            expect(preProcessDependencies('ui , tools , i18n')).toEqual(['ui', 'tools', 'i18n']);
            expect(preProcessDependencies('ui')).toEqual(['ui']);
        });
    });

    describe('getBuildConfig', () => {
        it('should return config with defaults and merge options', () => {
            const config = getBuildConfig();
            expect(config.slim).toBe(false);
            expect(config.watch).toBe(false);

            const customConfig = getBuildConfig({ minify: true, deps: ['ui'] });
            expect(customConfig.minify).toBe(true);
            expect(customConfig.deps).toEqual(['ui']);
        });

        it('should respect and override environment config', () => {
            process.env.ARPADROID_BUILD_CONFIG = JSON.stringify({ buildTypes: true });
            expect(getBuildConfig().buildTypes).toBe(true);
            expect(getBuildConfig({ buildTypes: false }).buildTypes).toBe(false);
        });

        it('should handle deps based on slim mode', () => {
            const withDeps = getBuildConfig({ slim: false, deps: ['ui'] });
            expect(withDeps.deps).toEqual(['ui']);

            process.env.arpadroid_slim = 'true';
            expect(getBuildConfig().deps).toBeUndefined();
        });

        it('should throw on invalid JSON', () => {
            process.env.ARPADROID_BUILD_CONFIG = 'invalid-json';
            expect(() => getBuildConfig()).toThrow();
        });
    });

    describe('getInput', () => {
        /** @type {Project} */
        let project;

        beforeEach(() => {
            project = new Project('test-project', { path: TEST_PROJECT_PATH });
        });

        it('should return simple entry for slim or no deps', () => {
            expect(getInput(project, { slim: true })).toBe('src/index.js');
            expect(getInput(project, { slim: false })).toBe('src/index.js');
        });

        it('should return array with deps for fat build', () => {
            const input = getInput(project, { slim: false, deps: ['ui'] });
            expect(Array.isArray(input)).toBe(true);
            expect(input[0]).toBe('src/index.js');
        });

        it('should filter non-existent dependencies', () => {
            const input = getInput(project, { slim: false, deps: ['non-existent'] });
            expect(input).toEqual(['src/index.js']);
        });
    });

    describe('getExternal', () => {
        it('should handle external dependencies correctly', () => {
            expect(getExternal()).toEqual([]);
            expect(getExternal({})).toEqual([]);
            expect(getExternal({ external: [] })).toEqual([]);
            expect(getExternal({ external: ['ui', 'tools'] })).toEqual(['@arpadroid/ui', '@arpadroid/tools']);
        });

        it('should include context in slim mode', () => {
            process.env.arpadroid_slim = 'true';
            const external = getExternal({ external: ['ui'] });

            expect(external).toContain('@arpadroid/context');
            expect(external).toContain('@arpadroid/ui');
        });
    });

    describe('getBuild', () => {
        /** @type {import('./rollup-builds.types.js').BuildConfigType} */
        const baseConfig = {
            path: TEST_PROJECT_PATH,
            buildTypes: false,
            buildStyles: false,
            buildType: 'uiComponent'
        };

        it('should return valid build config for library and uiComponent', () => {
            const lib = getBuild('test-project', baseConfig);
            expect(lib.build).toBeDefined();
            expect(lib.appBuild).toBeDefined();
            expect(lib.project).toBeInstanceOf(Project);
            expect(lib.Plugins).toBeDefined(); // @ts-ignore
            expect(lib?.output?.format).toBe('esm');

            const ui = getBuild('test-project', baseConfig);
            expect(ui.build).toBeDefined();
            expect(Array.isArray(ui.build)).toBe(true);
            expect(ui.plugins).toBeDefined();
        });

        it('should return empty object for invalid build name', () => {
            expect(
                getBuild('test-project', {
                    ...baseConfig, // @ts-ignore
                    buildType: 'invalidBuildName'
                })
            ).toEqual({});
        });

        it('should configure project and plugins correctly', () => {
            const result = getBuild('test-project', baseConfig);

            expect(result?.project?.name).toBe('test-project');
            expect(result?.Plugins?.terser).toBeDefined();
            expect(result?.Plugins?.nodeResolve).toBeDefined(); // @ts-ignore
            expect(result?.output?.file).toContain('arpadroid-test-project.js');
        });

        it('should handle slim mode and custom config', () => {
            process.env.arpadroid_slim = 'true';
            const result = getBuild('test-project', {
                ...baseConfig,
                minify: true,
                deps: ['my-dep']
            });

            expect(result?.buildConfig?.slim).toBe(true);
            expect(result?.buildConfig?.minify).toBe(true);
            expect(result?.buildConfig?.deps).toEqual(['my-dep']);
        });

        it('should call processBuilds callback only when not slim', () => {
            let called = false;

            getBuild('test-project', {
                ...baseConfig,
                slim: false,
                processBuilds: () => {
                    called = true;
                }
            });
            expect(called).toBe(true);

            called = false;
            process.env.arpadroid_slim = 'true';
            getBuild('test-project', {
                ...baseConfig,
                processBuilds: () => {
                    called = true;
                }
            });
            expect(called).toBe(false);
        });
    });

    describe('integration', () => {
        it('should create valid rollup config with complex options', () => {
            const result = getBuild('test-project', {
                buildType: 'library',
                path: TEST_PROJECT_PATH,
                deps: ['ui', 'tools'],
                external: ['services'],
                aliases: ['context'],
                buildTypes: false,
                buildStyles: false
            });

            const config = result?.build?.[0];
            expect(config?.input).toBeDefined();
            expect(config?.output).toBeDefined();
            expect(Array.isArray(config?.plugins)).toBe(true);
            expect(result?.buildConfig?.deps).toEqual(['ui', 'tools']);
            expect(result?.buildConfig?.external).toEqual(['services']);
        });
    });
});
