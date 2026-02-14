import ProjectTest from './projectTest.mjs';
import Project from '../project/project.mjs';
import { TEST_PROJECT_PATH } from '../project/tests/projectTest.util.mjs';
import { dirname, join, resolve } from 'path';
import { getJestConfigPath } from '../project/helpers/projectJest.helper.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ProjectTest', () => {
    /** @type {Project} */
    let project;
    let projectTest;

    beforeAll(() => {
        project = new Project('test-project', {
            path: TEST_PROJECT_PATH,
            logHeading: false
        });
    });

    test('getModulePath returns correct module path for other projects', () => {
        const proj = new Project('test-project', {
            path: TEST_PROJECT_PATH
        });
        const resolved = resolve(join(__dirname, '..', '..'));
        expect(proj.getModulePath()).toBe(resolved);
    });

    describe('constructor', () => {
        it('should create a ProjectTest instance with required properties', () => {
            projectTest = new ProjectTest(project);

            expect(projectTest).toBeInstanceOf(ProjectTest);
            expect(projectTest.project).toBe(project);
            expect(projectTest.config).toBeDefined();
            expect(projectTest.scripts).toBeDefined();
        });

        it('should merge custom config with defaults', () => {
            const customConfig = { storybook: true, jest: false };
            projectTest = new ProjectTest(project, customConfig);

            expect(projectTest?.config?.storybook).toBe(true);
            expect(projectTest?.config?.jest).toBe(false);
        });
    });

    describe('setConfig', () => {
        it('should merge config with defaults', () => {
            projectTest = new ProjectTest(project);
            projectTest.setConfig({ jest: true });

            expect(projectTest?.config?.jest).toBe(true);
            expect(projectTest.config).toHaveProperty('storybook');
            expect(projectTest.config).toHaveProperty('ci');
        });
    });

    describe('getDefaultConfig', () => {
        it('should return config with expected properties', () => {
            projectTest = new ProjectTest(project);
            const config = projectTest.getDefaultConfig();

            expect(config).toHaveProperty('storybook');
            expect(config).toHaveProperty('jest');
            expect(config).toHaveProperty('ci');
            expect(config).toHaveProperty('query');
            expect(config).toHaveProperty('browsers');
            expect(config).toHaveProperty('build');
        });
    });

    describe('getJestConfigLocation', () => {
        it('should return a path containing jest config', () => {
            projectTest = new ProjectTest(project);
            const configPath = getJestConfigPath(projectTest.project);

            expect(configPath).toContain('.config.mjs');
            expect(typeof configPath).toBe('string');
        });
    });
});
