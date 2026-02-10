import { getProject } from '../project/projectStore.mjs';
import { getJestSetupFiles } from '../project/helpers/projectJest.helper.js';

const project = getProject();
if (!project) throw new Error('Project not found');
const config = await project?.getBuildConfig();
const { jest: jestConfig } = config || {};

export default {
    verbose: true,
    coverageReporters: ['html', 'text', 'cobertura'],
    testEnvironment: 'node',
    testMatch: jestConfig?.testMatch,
    moduleFileExtensions: ['js', 'mjs'],
    setupFilesAfterEnv: await getJestSetupFiles(project),
    transform: {
        '^.+\\.m?js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
    },
    fakeTimers: { enableGlobally: true },
    injectGlobals: true,
    globals: {},
    transformIgnorePatterns: [
        'node_modules/(?!(@arpadroid|chokidar|readdirp|anymatch|normalize-path|picomatch|glob-parent|braces|fill-range|to-regex-range|is-number|is-extglob|is-glob|chalk|glob|minimatch|yargs|yargs-parser)/)'
    ],
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
