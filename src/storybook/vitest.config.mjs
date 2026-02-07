// @ts-nocheck
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { STORYBOOK_PORT, STORYBOOK_URL, STORYBOOK_CONFIG_DIR } = process.env;
const storybookUrl = STORYBOOK_URL || `http://127.0.0.1:${STORYBOOK_PORT || 6006}`;
const configDir = STORYBOOK_CONFIG_DIR || '.storybook';
const setupFile = resolve(configDir, 'vitest.setup.ts');
export default defineConfig({
    appType: 'spa',
    plugins: [storybookTest({ storybookUrl, configDir })],
    test: {
        uiBase: true,
        globals: true,
        browser: {
            enabled: true,
            name: 'chromium',
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            headless: true
        },
        setupFiles: [setupFile]
    }
});
