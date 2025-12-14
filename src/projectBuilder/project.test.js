/**
 * @jest-environment node
 */

import Project from './project.mjs';
import path from 'path';
import { existsSync } from 'fs';

const TEST_PROJECT_PATH = path.join(process.cwd(), 'src/test/test-project');

describe('Project', () => {
    let testProject;

    beforeEach(() => {
        testProject = new Project('test-project', { path: TEST_PROJECT_PATH });
    });

    describe('constructor and basic properties', () => {
        it('should initialize with config and set properties correctly', () => {
            const project = new Project('module', {
                basePath: process.cwd(),
                logHeading: false
            });

            expect(project).toBeInstanceOf(Project);
            expect(project.name).toBe('module');
            expect(project.config.basePath).toBe(process.cwd());
            expect(project.config.logHeading).toBe(false);
            expect(project.path).toBeDefined();
            expect(project.i18nFiles).toEqual([]);
            
            expect(testProject.name).toBe('test-project');
            expect(testProject.path).toBe(TEST_PROJECT_PATH);
            expect(testProject.pkg.name).toBe('@arpadroid/test-project');
        });
    });

    describe('package.json and config', () => {
        it('should load package.json with correct structure', () => {
            const pkg = testProject.getPackageJson();

            expect(pkg.name).toBe('@arpadroid/test-project');
            expect(pkg.version).toBe('1.0.0');
            expect(pkg.scripts).toBeDefined();
            expect(pkg.peerDependencies).toBeDefined();
        });

        it('should load and merge file config', async () => {
            const config = await testProject.getFileConfig();
            expect(config.buildJS).toBe(true);
            expect(config.buildI18n).toBe(true);
            expect(config.minify).toBe(true);

            const buildConfig = await testProject.getBuildConfig({ buildJS: false, custom: true });
            expect(buildConfig.buildJS).toBe(false);
            expect(buildConfig.buildI18n).toBe(true);
            expect(buildConfig.custom).toBe(true);
        });
    });

    describe('themes and styles', () => {
        it('should handle themes correctly', () => {
            const themes = testProject.getThemes();
            expect(Array.isArray(themes)).toBe(true);
            expect(themes).toContain('default');
            expect(testProject.hasStyles()).toBe(true);
            
            const themesPath = testProject.getThemesPath();
            expect(themesPath).toBe(path.join(TEST_PROJECT_PATH, 'src/themes'));
            expect(existsSync(themesPath)).toBe(true);
        });
    });

    describe('dependencies', () => {
        it('should extract and sort arpadroid dependencies', () => {
            const deps = testProject.getDependencies();
            expect(Array.isArray(deps)).toBe(true);
            expect(deps).toContain('ui');
            expect(deps).toContain('tools');

            const sorted = testProject.getDependencies(['ui', 'tools']);
            expect(sorted[0]).toBe('ui');
            expect(sorted[1]).toBe('tools');
        });
    });

    describe('validation', () => {
        it('should validate existing and non-existing project paths', () => {
            expect(testProject.validate()).toBe(true);

            const originalError = console.error;
            console.error = () => {};
            const invalid = new Project('non-existent', { path: '/invalid/path' });
            expect(invalid.validate()).toBe(false);
            console.error = originalError;
        });
    });
});
