import { getProject } from '../project/projectStore.mjs';
import { getJestSetupFiles } from '../project/helpers/projectJest.helper.js';

const project = getProject();
if (!project) throw new Error('Project not found');
const config = await project?.getBuildConfig();

export default {
    coverageReporters: ['html', 'text', 'cobertura'],
    fakeTimers: { enableGlobally: true },
    globals: {},
    injectGlobals: true,
    moduleFileExtensions: ['js', 'mjs'],
    setupFilesAfterEnv: await getJestSetupFiles(project),
    testEnvironment: 'jsdom',
    testMatch: config?.jest?.testMatch,
    testPathIgnorePatterns: [],
    transform: { '^.+\\.m?js$': 'babel-jest' },
    // Do not ignore node_modules so packages needing transformation are handled
    transformIgnorePatterns: [],
    verbose: true,
    reporters: [
        'default',
        [
            'jest-junit',
            {
                // outputDirectory: "",
                outputName: 'junit.xml'
            }
        ]
    ]
};
