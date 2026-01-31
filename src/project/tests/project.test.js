/* eslint-disable security/detect-non-literal-fs-filename */

import Project from '../project.mjs';
import { basename } from 'path';
import { existsSync } from 'fs';
import { spyOn } from 'jest-mock';
import { getAllDependencies, getDependencies } from '../helpers/projectBuild.helper.mjs';

const cwd = process.cwd();

describe('@arpadroid/module Project Instance', () => {
    /** @type {Project | undefined}*/
    let project;
    beforeAll(() => {
        project = new Project('module');
    });

    test('getPath returns correct project path', () => {
        expect(project?.getPath()).toBe(cwd);
        expect(basename(cwd)).toBe('module');
    });

    test('getModulePath returns correct module path', () => {
        expect(project?.getModulePath()).toBe(cwd);
    });

    test('getDependencies returns default sort order', () => {
        const deps = project && getDependencies(project, []);
        expect(Array.isArray(deps)).toBe(true);
        expect(deps?.map(dep => dep.name)).toEqual(['logger', 'style-bun', 'tools-iso', 'tools-node']);
    });

    test('getDependencies accepts options object', () => {
        const deps = project && getDependencies(project, { sort: [] });
        expect(Array.isArray(deps)).toBe(true);
        expect(deps?.map(dep => dep.name)).toEqual(['logger', 'style-bun', 'tools-iso', 'tools-node']);
    });

    test('getAllDependencies resolves transitive dependencies', async () => {
        await project?.promise;
        const deps = project && (await getAllDependencies(project, { sort: [] }));
        expect(Array.isArray(deps)).toBe(true);
        // Module's direct deps are logger, style-bun, tools-iso
        // Each of those may have their own deps which should be included
        const depNames = deps?.map(dep => dep.name) || [];
        expect(depNames).toContain('logger');
        expect(depNames).toContain('style-bun');
        expect(depNames).toContain('tools-iso');
        expect(depNames).toContain('tools-node');
    });

    test('getAllDependencies completes without infinite loop', async () => {
        await project?.promise;
        const deps = project && (await getAllDependencies(project, { sort: [] }));
        expect(deps?.length).toBeGreaterThan(0);
        // Each dependency should appear only once (deduplication via visited set)
        const names = deps?.map(dep => dep.name) ?? [];
        expect(names.length).toBe(new Set(names).size);
    });

    test('_getFileConfig returns empty object when no config file exists', async () => {
        const config = await Project._getFileConfig('/non/existent/path');
        expect(config).toEqual({});
    });

    it('cleans up project', async () => {
        await project?.cleanBuild();
        expect(existsSync(`${cwd}/dist`)).toBe(false);
    });

    it('builds project', async () => {
        await project?.promise;
        await project?.build();
        expect(existsSync(`${project?.path}/dist`)).toBe(true);
    });

    test('builds project and dependencies with no types, overriding value through build method config', async () => {
        // Spy on the exports object which is used internally
        await project?.promise;
        await project?.build({ buildTypes: false });
        // const hasTypes = await ;
        expect(existsSync(`${cwd}/dist/@types`)).toBe(false);
    });

    test('_getFileConfig returns config from existing config file', async () => {
        const config = await Project._getFileConfig(project?.path);
        expect(config.buildType).toBe('library');
    });
    test('_getFileConfig returns empty object when no config file exists', async () => {
        const config = await Project._getFileConfig('/non/existent/path');
        expect(config).toEqual({});
    });

    test('Logs error when a dependency is missing', async () => {
        const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

        await project?.promise;
        await project
            ?.build({
                buildDeps: true,
                buildTypes: false,
                deps: ['non-existent-dependency']
            })
            .catch(() => {
                const calls = consoleErrorSpy.mock.calls;
                expect(calls[0][0]).toContain('Could not determine path for project non-existent-dependency');
                expect(calls[1][0]).toContain('Project non-existent-dependency does not exist');
            });
        consoleErrorSpy.mockRestore();
    });
});

describe('Project watch() method', () => {});
