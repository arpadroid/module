import { getProject } from '../project/projectStore.mjs';
import { getJestSetupFiles, getTestMatch } from '../project/helpers/projectJest.helper.js';

const project = getProject();
if (!project) throw new Error('Project not found');

export default {
    coverageReporters: ['html', 'text', 'cobertura'],
    fakeTimers: { enableGlobally: true },
    globals: {},
    injectGlobals: true,
    moduleFileExtensions: ['js', 'mjs'],
    setupFilesAfterEnv: await getJestSetupFiles(project),
    testEnvironment: 'jsdom',
    testMatch: await getTestMatch(project),
    testPathIgnorePatterns: [],
    transform: { '^.+\\.m?js$': 'babel-jest' },
    // Do not ignore node_modules so packages needing transformation are handled
    transformIgnorePatterns: [],
    verbose: false
};
