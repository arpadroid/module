/**
 * @jest-environment node
 */
import Project from '../project.mjs';
import path, { basename } from 'path';
import { existsSync } from 'fs';
import { TEST_PROJECT_PATH } from './projectTest.util.mjs';
import { getDependencies } from '../helpers/projectBuild.helper.mjs';

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

    test('getModulePath returns correct module path for other projects', () => {
        const proj = new Project('test-project', {
            path: TEST_PROJECT_PATH
        });
        expect(proj.getModulePath()).toBe(path.join(TEST_PROJECT_PATH, 'node_modules/@arpadroid/module'));
    });

    test('getDependencies returns default sort order', () => {
        const deps = project?.pkg && getDependencies(project?.pkg, []);
        expect(Array.isArray(deps)).toBe(true);
        expect(deps).toEqual(['style-bun']);
    });

    test('_getFileConfig returns empty object when no config file exists', async () => {
        const config = await Project._getFileConfig('/non/existent/path');
        expect(config).toEqual({});
    });

    /**
     * @todo Replace the require in _getFileConfig so that this test can be enabled.
     */
    // test('_getFileConfig returns config from existing config file', async () => {
    //     const config = Project._getFileConfig(TEST_PROJECT_PATH);
    //     // expect(config).toEqual({ testKey: 'testValue' });
    //     console.log('config', config);
    //     expect(config.buildType).toBe('uiComponent');
    // });

    it('cleans up project', async () => {
        await project?.cleanBuild();
        expect(existsSync(`${cwd}/dist`)).toBe(false);
    });

    it('builds project', async () => {
        await project?.build();
        expect(existsSync(`${cwd}/dist`)).toBe(true);
    });
});
