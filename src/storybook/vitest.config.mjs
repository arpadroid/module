import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { getProject } from '../project/projectStore.mjs';

const argv = /** @type {import('yargs').Arguments} */ (yargs(hideBin(process.argv)).argv) || {};
const project = getProject();
await project?.promise;
const projectConfig = await project?.getBuildConfig();
const STORYBOOK_PORT = argv?.storybook || process.env.STORYBOOK_PORT || projectConfig?.storybook_port || 6006;
const BROWSERS = project?.getBrowsers();
console.log('BROWSERS', BROWSERS);
const { STORYBOOK_URL, STORYBOOK_CONFIG_DIR } = process.env;
const storybookUrl = STORYBOOK_URL || `http://127.0.0.1:${STORYBOOK_PORT || 6006}`;
const configDir = STORYBOOK_CONFIG_DIR || '.storybook';
const setupFile = resolve(configDir, 'vitest.setup.ts');
export default defineConfig({
    plugins: [storybookTest({ storybookUrl, configDir })],
    test: {
        globals: true,
        browser: {
            enabled: true,
            provider: playwright(),
            instances: BROWSERS,
            headless: true
        },
        setupFiles: [setupFile]
    }
});
