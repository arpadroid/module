import { spyOn } from 'jest-mock';

import Project from '../project.mjs';
import { TEST_PROJECT_PATH } from '../tests/projectTest.util.mjs';
import { getStorybookCmd, getStorybookConfigPath, runStorybook } from './projectStorybook.helper.js';

describe('Project Storybook Helper', () => {
    /** @type {Project} */
    let project;

    beforeAll(async () => {
        project = new Project('test-project', {
            path: TEST_PROJECT_PATH
        });
        await project.promise;
    });

    test('getStorybookConfigPath returns correct path when .storybook exists', () => {
        const configPath = getStorybookConfigPath(project);
        // The test project does not have .storybook, so it should return the module path
        expect(configPath).toBe(`${project.path}/.storybook`);
    });

    test('throws warning when no storybook config found', async () => {
        const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
        const fakeProject = new Project('fake-project', {
            path: '/non/existent/path'
        });

        await fakeProject.promise.catch(() => {
            const calls = errorSpy.mock.calls;
            expect(calls[0][0]).toContain('Could not determine path for project fake-project');
            expect(calls[1][0]).toContain('Project fake-project does not exist');
        });
    });

    test('Returns the expected storybook command string', () => {
        const cmd = getStorybookCmd(project, 5000);
        console.log('cmd', cmd);
        expect(cmd.includes('5000')).toBe(true);
        expect(cmd.includes(project.path || '')).toBe(true);
    });

    test('Calls runStorybook without a port and does not execute', async () => {
        const result = await runStorybook(project, { slim: false });
        expect(result).toBe(false);
    });

    // test('Calls runStorybook with a port and spawns process', async () => {
    //     const result = await runStorybook(project, { slim: false, storybook_port: 6006 }, { stdio: 'pipe' });
    //     expect(result).toBe(0);
    // });
});
