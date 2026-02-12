import { getProject } from '../project/projectStore.mjs';
import { getJestSetupFiles, getTestMatch } from '../project/helpers/projectJest.helper.js';

const project = getProject();
if (!project) throw new Error('Project not found');
const config = await project?.getBuildConfig();
const testMatch = await getTestMatch(project);

export default {
    verbose: false,
    coverageReporters: ['html', 'text', 'cobertura'],
    testEnvironment: 'node',
    testMatch,
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
    ]
};
