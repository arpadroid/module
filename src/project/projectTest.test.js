/**
 * @jest-environment node
 */

import ProjectTest from './projectTest.mjs';
import Project from './project.mjs';
import path from 'path';

const TEST_PROJECT_PATH = path.join(process.cwd(), 'src/test/test-project');

describe('ProjectTest', () => {
    let project;
    let projectTest;

    beforeEach(() => {
        project = new Project('test-project', {
            path: TEST_PROJECT_PATH,
            logHeading: false
        });
    });

    describe('constructor', () => {
        it('should create a ProjectTest instance with required properties', () => {
            projectTest = new ProjectTest(project);

            expect(projectTest).toBeInstanceOf(ProjectTest);
            expect(projectTest.project).toBe(project);
            expect(projectTest.config).toBeDefined();
            expect(projectTest.scripts).toBeDefined();
            expect(projectTest.pm2).toBeDefined();
            expect(projectTest.sb).toBeDefined();
            expect(projectTest.httpServer).toBeDefined();
            expect(projectTest.testResponse).toEqual({
                success: true,
                message: '',
                payloads: []
            });
        });

        it('should merge custom config with defaults', () => {
            const customConfig = { storybook: true, jest: false };
            projectTest = new ProjectTest(project, customConfig);

            expect(projectTest.config.storybook).toBe(true);
            expect(projectTest.config.jest).toBe(false);
        });
    });

    describe('setConfig', () => {
        it('should merge config with defaults', () => {
            projectTest = new ProjectTest(project);
            projectTest.setConfig({ jest: true });

            expect(projectTest.config.jest).toBe(true);
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
            const configPath = projectTest.getJestConfigLocation();
            
            expect(configPath).toContain('jest.config');
            expect(typeof configPath).toBe('string');
        });
    });
});
