import Project from '../project.mjs';
import { spyOn } from 'jest-mock';
describe('Bad Project Instance', () => {
    /** @type {Project | undefined}*/
    let project;
    /** @type {jest.SpyInstance} */
    let errSpy;
    beforeAll(() => {
        errSpy = spyOn(console, 'error').mockImplementation(() => {});
        project = new Project('non-existent', {});
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

    afterAll(() => {
        errSpy.mockRestore();
    });
});
