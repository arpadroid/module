// @ts-nocheck
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
    STORYBOOK_PORT,
    STORYBOOK_CONFIG_DIR,
    STORYBOOK_URL,
    STORYBOOK_SCRIPT,
    STORYBOOK_PROJECT_ROOT,
    PROJECT_PATH
} = process.env;

console.log('STORYBOOK_PROJECT_ROOT', STORYBOOK_PROJECT_ROOT);

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookConfigDir = STORYBOOK_CONFIG_DIR || '.storybook';
const storybookUrl = STORYBOOK_URL || `http://127.0.0.1:${STORYBOOK_PORT || 6006}`;
const storybookScript = STORYBOOK_SCRIPT;
const projectPath = PROJECT_PATH || process.cwd();
console.log('PROJECT_PATH', PROJECT_PATH);

// Convert absolute storybookConfigDir to relative path from projectPath if needed
let configDir = storybookConfigDir;
if (path.isAbsolute(storybookConfigDir)) {
    // Keep absolute path - Storybook needs to know where to find main.js
    configDir = storybookConfigDir;
}
export default defineConfig({
    base: projectPath,
    appType: 'browser',
    
    root: projectPath,

    resolve: {
        alias: {
            vitest: path.join(moduleRoot, 'node_modules/vitest'),
            '@storybook/addon-vitest': path.join(moduleRoot, 'node_modules/@storybook/addon-vitest'),
            '@storybook/builder-vite': path.join(moduleRoot, 'node_modules/@storybook/builder-vite/index.js'),
            '/node_modules/@arpadroid/module/.storybook/preview.js': path.join(moduleRoot, '/.storybook/preview.js'),
        }
    },

    plugins: [
        storybookTest({
            configDir,
            storybookUrl,
            storybookScript
        })
    ],
    test: {
        uiBase: true,
        browser: {
            enabled: true,
            name: 'chromium',
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
        }
    }
});
