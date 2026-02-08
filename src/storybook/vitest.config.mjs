import { defineConfig } from 'vitest/config';
import { join, resolve } from 'path';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { getProject } from '../project/projectStore.mjs';
import { getStorybookCmd } from '../project/helpers/projectStorybook.helper.js';

const argv = /** @type {import('yargs').Arguments} */ (yargs(hideBin(process.argv)).argv) || {};
const project = /** @type {import('../project/project.mjs').default} */ (getProject());
await project?.promise;
const projectConfig = await project?.getBuildConfig();
const STORYBOOK_PORT = Number(
    projectConfig?.storybook_port || argv?.storybook || process.env.STORYBOOK_PORT || 6006
);
const BROWSERS = project?.getBrowsers();
const { STORYBOOK_URL, STORYBOOK_CONFIG_DIR } = process.env;
const storybookUrl = STORYBOOK_URL || `http://127.0.0.1:${STORYBOOK_PORT || 6006}`;
const configDir = STORYBOOK_CONFIG_DIR || '.storybook';
const moduleRoot = project.getModulePath() || '';

/** @type {import('vitest/config').UserProjectConfigExport} */
const config = {
    resolve: {
        alias: [
            {
                find: '@vitest/coverage-v8',
                replacement: join(moduleRoot, 'node_modules/@vitest/coverage-v8/dist')
            }
        ]
    },
    test: {
        globals: true,
        projects: [
            {
                extends: true,

                plugins: [
                    storybookTest({
                        storybookUrl,
                        configDir,
                        storybookScript: getStorybookCmd(project, STORYBOOK_PORT)
                    })
                ],
                test: {
                    environment: 'jsdom',
                    name: 'storybook',
                    exclude: ['**/node_modules/**', '**/dist/**', '**/storybook-static/**'],
                    root: './src',
                    dir: './src',
                    browser: {
                        enabled: true,
                        provider: playwright({}),
                        headless: true,
                        instances: BROWSERS
                    },
                    setupFiles: [resolve(configDir, 'vitest.setup.ts')]
                }
            }
        ]
    }
};
export default defineConfig(config);
