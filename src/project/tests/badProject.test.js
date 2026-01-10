import Project from '../project.mjs';

describe('Bad Project Instance', () => {
    /** @type {Project | undefined}*/
    let project;
    beforeAll(() => {
        project = new Project('non-existent', {});
    });

    test('getPath returns undefined if no path is found or provided', () => {
        expect(project?.getPath()).toBeUndefined();
    });

    test('validate returns false for non-existent project path', () => {
        expect(project?.validate()).toBe(false);
    });
});
