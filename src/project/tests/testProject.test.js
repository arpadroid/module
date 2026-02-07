/* eslint-disable security/detect-non-literal-fs-filename */
import { fn, spyOn } from 'jest-mock';
import { join } from 'path';
import Project from '../project.mjs';
import { TEST_PROJECT_PATH } from './projectTest.util.mjs';
import { existsSync, readFileSync } from 'fs';
import { getFileConfig, getPackageJson } from '../helpers/projectBuild.helper.mjs';
import { getBuildConfig, getDependencies } from '../helpers/projectBuild.helper.mjs';
import { getThemes, getThemesPath, hasStyles } from '../helpers/projectStyles.helper.js';

describe('Test Project Instance', () => {
    let originalCwd = '';
    /** @type {Project}*/
    let project;
    beforeAll(async () => {
        originalCwd = process.cwd();
        process.chdir(TEST_PROJECT_PATH);
        project = new Project('test-project', {
            path: TEST_PROJECT_PATH,
            logHeading: false
        });
        await project.promise;
    });
    afterAll(() => {
        process.chdir(originalCwd);
    });
    it('Initializes with expected configuration and properties', () => {
        expect(project).toBeInstanceOf(Project);
        expect(project?.name).toBe('test-project');
        expect(project?.config?.logHeading).toBe(false);
        expect(project?.path).toBeDefined();
        expect(project?.i18nFiles).toEqual([]);
        expect(project?.name).toBe('test-project');
        expect(project?.path).toBe(TEST_PROJECT_PATH);
        expect(project?.pkg.name).toBe('@arpadroid/test-project');
    });

    test('getPath returns correct project path', () => {
        expect(project?.getPath()).toBe(TEST_PROJECT_PATH);
    });

    test('getPath returns correct default path if no path is provided', () => {
        const _path = project?.getPath();
        project?.config && (project.config.path = undefined);
        expect(project?.getPath()).toBe(process.cwd());
        expect(project?.getPath()).toBe(TEST_PROJECT_PATH);
        project?.config && (project.config.path = _path);
    });

    it('should load package.json with correct structure', async () => {
        const pkg = await getPackageJson(TEST_PROJECT_PATH);
        expect(pkg?.name).toBe('@arpadroid/test-project');
        expect(pkg?.scripts).toBeDefined();
        expect(pkg?.peerDependencies).toBeDefined();
    });

    it('should load and merge file config', async () => {
        const config = await getFileConfig(project);
        expect(config.buildJS).toBe(true);
        expect(config.buildI18n).toBe(true);
        expect(config.minify).toBe(true);

        const buildConfig = await project?.getBuildConfig({ buildJS: false, buildI18n: false });
        expect(buildConfig?.buildJS).toBe(false);
        expect(buildConfig?.buildI18n).toBe(false);
    });

    it('should handle themes correctly', async () => {
        const themes = getThemes(project);
        expect(Array.isArray(themes)).toBe(true);
        expect(themes).toContain('default');
        expect(await hasStyles(project)).toBe(true);

        const themesPath = getThemesPath(project);
        expect(themesPath).toBe(join(TEST_PROJECT_PATH, 'src/themes'));
        expect(existsSync(themesPath ?? '')).toBe(true);
    });

    it('should extract and sort arpadroid dependencies', () => {
        const deps = getDependencies(project);
        expect(Array.isArray(deps)).toBe(true);
        expect(deps.find(dep => dep.name === 'ui')).toBeDefined();
        expect(deps.find(dep => dep.name === 'tools')).toBeDefined();

        const sorted = getDependencies(project, ['ui', 'tools']) || [];
        expect(sorted[0]).toEqual({ name: 'ui', path: project.path + '/node_modules/@arpadroid/ui' });
        expect(sorted[1]).toEqual({ name: 'tools', path: project.path + '/node_modules/@arpadroid/tools' });
    });

    it('should validate existing and non-existing project paths', async () => {
        expect(project?.validate()).toBe(true);
        const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
        const invalid = new Project('non-existent', { path: '/invalid/path' });
        await invalid.promise.catch(() => {
            expect(invalid.valid).toBe(false);
        });
        errorSpy.mockRestore();
    });

    it('Installs the project', async () => {
        await project.cleanBuild();
        await project.install();
        expect(existsSync(`${TEST_PROJECT_PATH}/package-lock.json`)).toBe(true);
        expect(existsSync(`${TEST_PROJECT_PATH}/node_modules`)).toBe(true);
    });

    test('watch command line argument is ignored if true and slim is true', async () => {
        const project = new Project('test-project', {
            path: TEST_PROJECT_PATH
        });
        const config2 = await getBuildConfig(project, { slim: true }, { watch: true });
        expect(config2.slim).toBe(true);
        expect(config2.watch).toBeFalsy();

        const config = await getBuildConfig(project, { slim: false }, { watch: true });
        expect(config.slim).toBe(false);
        expect(config.watch).toBe(true);
    });

    it('tests the project', async () => {
        const spy = spyOn(console, 'error');
        const logSpy = spyOn(console, 'log').mockImplementation(() => {});
        const result = await project.test({
            jest: true,
            ci: true,
            storybook: true
        });
        expect(existsSync(`${TEST_PROJECT_PATH}/dist/@types`)).toBe(true);
        expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('Error: Command failed'));
        // Verify that the Storybook Vitest tests actually passed
        expect(result).not.toHaveProperty('success', false);
        expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('Storybook Vitest tests failed'));
        logSpy.mockRestore();
        spy.mockRestore();
    }, 20000);

    describe('Builds the project in watch mode and checks watcher exists, verifies build files and replacement alias functionality', () => {
        /** @type {(event: unknown) => void} */
        const watchCallback = fn(event => {
            const payload = /** @type {{ code?: string | undefined }} */ (event);
            console.log('CODE:', payload?.code);
        });
        beforeAll(async () => {
            jest.useRealTimers();

            await project.cleanBuild();
            await project.build({
                buildTypes: false,
                watch: true,
                watchCallback,
                aliases: [
                    {
                        find: './components/testComponent/testComponent.js',
                        replacement: './components/testComponent2/testComponent2.js'
                    }
                ]
            });

            return Promise.resolve(true);
        });

        it('checks build files exist', async () => {
            expect(existsSync(`${TEST_PROJECT_PATH}/dist/arpadroid-test-project.js`)).toBe(true);
            expect(existsSync(`${TEST_PROJECT_PATH}/dist/themes/default/default.min.css`)).toBe(true);
            expect(existsSync(`${TEST_PROJECT_PATH}/dist/themes/my-theme/my-theme.min.css`)).toBe(true);
            expect(project?.watcher).toBeDefined();
            expect(typeof project?.watcher?.close).toBe('function');
        });

        it('calls the watch callback on file changes', async () => {
            watchCallback({ code: 'ERROR' });
            expect(watchCallback).toHaveBeenCalledTimes(5);
            expect(watchCallback).toHaveBeenCalledWith(expect.objectContaining({ code: 'ERROR' }));
            expect(watchCallback).toHaveBeenCalledWith(expect.objectContaining({ code: 'START' }));
            expect(watchCallback).toHaveBeenCalledWith(expect.objectContaining({ code: 'BUNDLE_START' }));
            expect(watchCallback).toHaveBeenCalledWith(expect.objectContaining({ code: 'BUNDLE_END' }));
        });

        it('verifies the replacement alias worked by checking for content from testComponent2.js', () => {
            expect(readFileSync(`${TEST_PROJECT_PATH}/dist/arpadroid-test-project.js`, 'utf-8')).toContain(
                'TestComponent2 Loaded'
            );
        });

        afterAll(async () => {
            await project?.watcher?.close();

            jest.useFakeTimers();
        });
    });

    /////////////////////////
    // #region Edge Cases
    /////////////////////////

    test('buildDependencies returns undefined when buildDeps is not true', async () => {
        const promise = await project.buildDependencies({ buildDeps: false, buildTypes: false });
        expect(promise).toBeUndefined();
    });

    test('watch command line argument is ignored if true and slim is true', async () => {
        const project = new Project('test-project', {
            path: TEST_PROJECT_PATH
        });
        const config2 = await getBuildConfig(project, { slim: true }, { watch: true });
        expect(config2.slim).toBe(true);
        expect(config2.watch).toBeFalsy();

        const config = await getBuildConfig(project, { slim: false }, { watch: true });
        expect(config.slim).toBe(false);
        expect(config.watch).toBe(true);
    });

    test('preProcessInputs trims any preceding ./ from input paths', async () => {
        const inputs = [
            './src/index.js',
            'src/index.js',
            './src/components/button/button.js',
            'src/components/button/button.js'
        ];
        const expected = [
            TEST_PROJECT_PATH + '/src/index.js',
            TEST_PROJECT_PATH + '/src/index.js',
            TEST_PROJECT_PATH + '/src/components/button/button.js',
            TEST_PROJECT_PATH + '/src/components/button/button.js'
        ];
        const rv = project.preProcessInputs(inputs);
        expect(rv).toEqual(expected);
    });

    // #endregion
});
