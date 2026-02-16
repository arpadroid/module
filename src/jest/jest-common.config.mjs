import { join } from 'node:path';
import { getJestSetupFiles, getTestMatch } from '../project/helpers/jest/projectJest.helper.js';
import { getProject } from '../project/projectStore.mjs';

const project = getProject();
if (!project) throw new Error('Project not found');
const modulesPath = join(project.getModulePath() || '', 'node_modules');

/** @type {import('jest').Config} */
export default {
    coverageReporters: ['html', 'text', 'cobertura'],
    fakeTimers: { enableGlobally: true },
    globals: {},
    injectGlobals: true,
    moduleFileExtensions: ['js', 'mjs'],
    setupFilesAfterEnv: await getJestSetupFiles(project),
    testMatch: await getTestMatch(project),
    testPathIgnorePatterns: [],
    transformIgnorePatterns: [], // Do not ignore node_modules so packages needing transformation are handled
    verbose: true
};
