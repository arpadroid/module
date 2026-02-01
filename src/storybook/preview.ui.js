// Extend ImportMeta to include 'env' property for Vite
/// <reference types="vite/client" />
/** @type { import('@storybook/web-components-vite').Preview } */
import { mergeObjects } from '@arpadroid/tools-iso';
import { usagePanelDecorator } from './decorators.js';
import flexLayoutDecorator from './layouts/flexLayout.jsx';

const defaultConfig = {
    decorators: [usagePanelDecorator(), flexLayoutDecorator()],
    parameters: {
        layout: 'centered', //'centered' | 'fullscreen' | 'padded'
        options: {
            storySort: {}
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i
            }
        }
    }
};
/**
 * @todo Review the below code.
 * Vite uses import.meta.env instead of process.env.
 */
let projectConfig = {};
try {
    const envConfig = typeof import.meta !== 'undefined' && import.meta.env?.STORYBOOK_PROJECT_CONFIG;
    if (envConfig) {
        projectConfig = JSON.parse(envConfig)?.storybook?.preview ?? {};
    }
    // eslint-disable-next-line sonarjs/no-ignored-exceptions
} catch (_e) {
    // Ignore parsing errors
}
const preview = mergeObjects(defaultConfig, projectConfig);
export default preview;
