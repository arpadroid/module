import { mergeObjects } from '@arpadroid/tools-iso';
import { usagePanelDecorator } from './decorators.js';
import flexLayoutDecorator from '../layouts/flexLayout.jsx';
import previewConfig from 'virtual:preview-config';

globalThis.litIssuedWarnings ??= new Set();
globalThis.litIssuedWarnings.add(
    'Lit is in dev mode. Not recommended for production! See https://lit.dev/msg/dev-mode for more information.'
);

/** @type {import('@storybook/web-components-vite').Preview} */
const defaultConfig = {
    decorators: [usagePanelDecorator(), flexLayoutDecorator()],
    parameters: {
        layout: 'centered', //'centered' | 'fullscreen' | 'padded'
        options: {},
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i
            }
        }
    }
};

const config = mergeObjects(defaultConfig, previewConfig, { mergeArrays: true });

export default { ...config };
