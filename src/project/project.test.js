/**
@jest-environment node
*/

import Project from './project.mjs';
import path from 'path';
import { existsSync } from 'fs';

const TEST_PROJECT_PATH = path.join(process.cwd(), 'src/test/test-project');

describe('Project', () => {
    describe('Static Properties', () => {
        // test('_getFileConfig should return correct default config', async () => {
        //     const config = await Project._getFileConfig();
        //     expect(config).toBeDefined();
        //     expect(typeof config).toBe('object');
        //     expect(config.buildJS).toBe(true);
        //     expect(config.buildTypes).toBe(true);
        //     expect(config.buildType).toBe('library');
        // });

        test('_getFileConfig returns empty object when no config file exists', async () => {
            const config = await Project._getFileConfig('/non/existent/path');
            expect(config).toEqual({});
        });
    });

    // describe('Getters', () => {
    //     test('getPath returns correct project path', () => {
    //         const project = new Project('test-project', {
    //             path: TEST_PROJECT_PATH,
    //         });
    //         expect
    //     });
    // });

    /** @type {Project | undefined}*/
    let project;

    describe('Test Project Instance', () => {
        beforeAll(() => {
            project = new Project('test-project', {
                path: TEST_PROJECT_PATH,
                basePath: process.cwd(),
                logHeading: false
            });
        });

        it('Initializes with expected configuration and properties', () => {
            expect(project).toBeInstanceOf(Project);
            expect(project.name).toBe('test-project');
            expect(project.config.basePath).toBe(process.cwd());
            expect(project.config.logHeading).toBe(false);
            expect(project.path).toBeDefined();
            expect(project.i18nFiles).toEqual([]);
            expect(project.name).toBe('test-project');
            expect(project.path).toBe(TEST_PROJECT_PATH);
            expect(project.pkg.name).toBe('@arpadroid/test-project');
        });

        test('getPath returns correct project path', () => {
            expect(project.getPath()).toBe(TEST_PROJECT_PATH);
        });

        test('getPath returns correct default path if no path is provided', () => {
            const _path = project.getPath();
            project.config.path = undefined;
            expect(project.getPath()).toBe(process.cwd() + '/node_modules/@arpadroid/test-project');
            project.config.path = _path;
        });

        it('should load package.json with correct structure', () => {
            const pkg = project.getPackageJson();
            expect(pkg.name).toBe('@arpadroid/test-project');
            expect(pkg.scripts).toBeDefined();
            expect(pkg.peerDependencies).toBeDefined();
        });

        it('should load and merge file config', async () => {
            const config = await project.getFileConfig();
            expect(config.buildJS).toBe(true);
            expect(config.buildI18n).toBe(true);
            expect(config.minify).toBe(true);

            const buildConfig = await project.getBuildConfig({ buildJS: false, custom: true });
            expect(buildConfig.buildJS).toBe(false);
            expect(buildConfig.buildI18n).toBe(true);
            expect(buildConfig.custom).toBe(true);
        });

        it('should handle themes correctly', () => {
            const themes = project.getThemes();
            expect(Array.isArray(themes)).toBe(true);
            expect(themes).toContain('default');
            expect(project.hasStyles()).toBe(true);

            const themesPath = project.getThemesPath();
            expect(themesPath).toBe(path.join(TEST_PROJECT_PATH, 'src/themes'));
            expect(existsSync(themesPath)).toBe(true);
        });

        it('should extract and sort arpadroid dependencies', () => {
            const deps = project.getDependencies();
            expect(Array.isArray(deps)).toBe(true);
            expect(deps).toContain('ui');
            expect(deps).toContain('tools');

            const sorted = project.getDependencies(['ui', 'tools']);
            expect(sorted[0]).toBe('ui');
            expect(sorted[1]).toBe('tools');
        });

        it('should validate existing and non-existing project paths', () => {
            expect(project.validate()).toBe(true);

            const originalError = console.error;
            console.error = () => {};
            const invalid = new Project('non-existent', { path: '/invalid/path' });
            expect(invalid.validate()).toBe(false);
            console.error = originalError;
        });
    });
});
