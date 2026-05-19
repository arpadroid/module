/**
 * @typedef {import('vitest/config').TestUserConfig['browser']} BrowserConfigOptions
 */
import { defineConfig } from 'vitest/config';
import { join } from 'path';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { getProject } from '../project/projectStore.mjs';
import { getStorybookCmd, getStorybookPort } from '../project/helpers/storybook/projectStorybook.helper.js';
import { getStorybookConfigPath } from '../project/helpers/storybook/projectStorybook.helper.js';
import { getBrowsersConfig } from './vitest.helper.js';
import { getAlias } from './main/mainResolutions.js';

const project = /** @type {import('../project/project.mjs').default} */ (getProject());

const configDir = getStorybookConfigPath(project);
const moduleRoot = project.getModulePath() || '';
const port = await getStorybookPort(project);
const aliases = /** @type {import('vite').Alias[]} */ ([
    getAlias('react'),
    getAlias('react/jsx-dev-runtime'),
    getAlias('react-dom'),
    getAlias('react-dom/client'),
    {
        find: '@vitest/coverage-v8',
        replacement: join(moduleRoot, 'node_modules/@vitest/coverage-v8/dist')
    },
    {
        find: '@storybook/addon-vitest/internal/setup-file',
        replacement: join(moduleRoot, 'node_modules/@storybook/addon-vitest/dist/vitest-plugin/setup-file.js')
    },
    {
        find: 'react/jsx-runtime',
        replacement: join(moduleRoot, 'node_modules/react/jsx-runtime.js')
    }
]);

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
                    }
                }
            }
        ]
    },
    resolve: {
        alias: aliases
    }
};
export default defineConfig(config);
