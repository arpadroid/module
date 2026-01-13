import Project from '../project.mjs';
import { TEST_PROJECT_PATH } from '../tests/projectTest.util.mjs';
import { getBuildConfig, getFileConfig } from './projectBuild.helper.mjs';

describe('Project Build Helper', () => {
    test('getFileConfig returns empty object when no config file exists', async () => {
        const config = await Project._getFileConfig('/non/existent/path');
        expect(config).toEqual({});

        await getFileConfig('/non/existent/path').then(cfg => {
            expect(cfg).toEqual({});
        });
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
});
