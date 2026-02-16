/**
 * @typedef {import('vitest/config').TestUserConfig['browser']} BrowserConfigOptions
 */
import { defineConfig } from 'vitest/config';
import { join, resolve } from 'path';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { getProject } from '../project/projectStore.mjs';
import { getStorybookCmd, getStorybookPort } from '../project/helpers/storybook/projectStorybook.helper.js';
import { getStorybookConfigPath } from '../project/helpers/storybook/projectStorybook.helper.js';
import { getBrowsersConfig } from './vitest.helper.js';

const project = /** @type {import('../project/project.mjs').default} */ (getProject());

const configDir = getStorybookConfigPath(project);
const moduleRoot = project.getModulePath() || '';
const port = await getStorybookPort(project);

/** @type {import('vitest/config').UserProjectConfigExport} */
const config = {
    test: {
        globals: true,
        projects: [
            {
                extends: true,
                plugins: [
                    storybookTest({
                        storybookUrl: `http://127.0.0.1:${port}`,
                        configDir,
                        storybookScript: getStorybookCmd(project, port) + ' --ci'
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
                        headless: true,
                        provider: playwright({}),
                        // @ts-ignore
                        instances: getBrowsersConfig(project)
                    },
                    setupFiles: [resolve(configDir, 'vitest.setup.ts')]
                }
            }
        ]
    },
    resolve: {
        alias: [
            {
                find: '@vitest/coverage-v8',
                replacement: join(moduleRoot, 'node_modules/@vitest/coverage-v8/dist')
            }
        ]
    }
};
export default defineConfig(config);
