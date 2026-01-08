/**
 * @jest-environment node
 */
/* eslint-disable security/detect-non-literal-fs-filename */
import { spyOn } from 'jest-mock';
import { join } from 'path';
import Project from '../project.mjs';
import { TEST_PROJECT_PATH } from './projectTest.util.mjs';
import { existsSync } from 'fs';
import { getDependencies, getFileConfig, getPackageJson } from '../helpers/projectBuild.helper.mjs';
import { getThemes, getThemesPath, hasStyles } from '../helpers/projectStyles.helper.js';

describe('Test Project Instance', () => {
    /** @type {Project}*/
    let project;
    const originalCwd = process.cwd();

    beforeAll(() => {
        process.chdir(TEST_PROJECT_PATH);
        project = new Project('test-project', {
            path: TEST_PROJECT_PATH,
            basePath: process.cwd(),
            logHeading: false
        });
    });

    it('Initializes with expected configuration and properties', () => {
        expect(project).toBeInstanceOf(Project);
        expect(project?.name).toBe('test-project');
        expect(project?.config?.basePath).toBe(process.cwd());
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
        expect(project?.getPath()).toBe(originalCwd + '/test/test-project');
        project?.config && (project.config.path = _path);
    });

    it('should load package.json with correct structure', async () => {
        const pkg = await getPackageJson(TEST_PROJECT_PATH);
        expect(pkg?.name).toBe('@arpadroid/test-project');
        expect(pkg?.scripts).toBeDefined();
        expect(pkg?.peerDependencies).toBeDefined();
    });

    it('should load and merge file config', async () => {
        const config = await getFileConfig(TEST_PROJECT_PATH);
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
        const deps = getDependencies(project?.pkg);
        expect(Array.isArray(deps)).toBe(true);
        expect(deps).toContain('ui');
        expect(deps).toContain('tools');

        const sorted = getDependencies(project.pkg, ['ui', 'tools']) || [];
        expect(sorted[0]).toBe('ui');
        expect(sorted[1]).toBe('tools');
    });

    it('should validate existing and non-existing project paths', () => {
        expect(project?.validate()).toBe(true);

        const originalError = console.error;
        console.error = () => {};
        const invalid = new Project('non-existent', { path: '/invalid/path' });
        expect(invalid.validate()).toBe(false);
        console.error = originalError;
    });

    it('Installs the project', async () => {
        await project.cleanBuild();
        await project.install();
        expect(existsSync(`${TEST_PROJECT_PATH}/package-lock.json`)).toBe(true);
        expect(existsSync(`${TEST_PROJECT_PATH}/node_modules`)).toBe(true);
    });

    it('tests the project', async () => {
        const spy = spyOn(console, 'error');
        await project.test({
            jest: true
        });
        expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('Error: Command failed'));
    });

    // it('Builds the environment and runs storybook', async () => {
    //     await project.build({
    //         buildJS: true,
    //         buildI18n: true
    //     });
    // });

    //////////////////////
    // #region Edge Cases
    //////////////////////

    test('buildDependencies returns undefined when buildDeps is not true', async () => {
        const promise = await project.buildDependencies({ buildDeps: false });
        expect(promise).toBeUndefined();
    });

    test('buildDependencies sets buildTypes to false in dependency builds if buildDeps is set to false in the buildConfig', async () => {
        await project.buildDependencies({ buildDeps: true, buildTypes: false });
        const deps = project.dependencyProjects || [];
        expect(deps.length).toBe(2);
        for (const dep of deps) {
            expect(dep.buildConfig?.buildTypes).toBe(false);
        }
    });

    //////////////////////
    // #endregion Edge Cases
    //////////////////////
});
