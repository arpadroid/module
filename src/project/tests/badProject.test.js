import { getFileConfig } from '../helpers/projectBuild.helper.mjs';
import { getStorybookConfigPath } from '../helpers/projectStorybook.helper.js';
import Project from '../project.mjs';
import { spyOn } from 'jest-mock';
describe('Bad Project Instance', () => {
    /** @type {Project}*/
    let project;
    /** @type {jest.SpyInstance} */
    let errSpy;
    beforeEach(() => {
        errSpy = spyOn(console, 'error').mockImplementation(() => {});
        project = new Project('non-existent', {});
    });

    test('getStorybookConfigPath logs error when no config found', async () => {
        await project?.promise.catch(async () => {
            const configPath = getStorybookConfigPath(project);
            expect(configPath).toBe('undefined/.storybook');
            expect(errSpy).toHaveBeenCalledWith(
                expect.stringContaining(`Storybook configuration not found for project "${project.name}"`),
                undefined
            );
        });
    });

    test('getPath returns undefined if no path is found or provided', async () => {
        await project?.promise.catch(() => {
            expect(project?.getPath()).toBeUndefined();
        });
    });

    test('validate returns false for non-existent project path', async () => {
        await project?.promise.catch(() => {
            expect(project?.validate()).not.toBe(true);
        });
    });
    test('getFileConfig throws error and returns empty object when no config file exists', async () => {
        await project?.promise.catch(() => {});
        const cfg = await getFileConfig(project);
        expect(cfg).toEqual({});
        expect(errSpy).toHaveBeenCalledWith(
            expect.stringContaining('Could not find configuration file, looked in the following locations:'),
            expect.any(Array)
        );
    });

    afterEach(() => {
        errSpy.mockRestore();
    });
});
