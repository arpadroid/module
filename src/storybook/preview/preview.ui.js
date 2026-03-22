/// <reference types="vite/client" />
import { mergeObjects } from '@arpadroid/tools-iso';
import flexLayoutDecorator from '../layouts/flexLayout.jsx';
import previewConfig from 'virtual:preview-config'; // @ts-ignore
import customElementsManifest from 'virtual:custom-elements-manifest';
import { usagePanelDecorator } from '../addons/usage/usage-addon.util.js';
import { processCustomElementsManifest, renderComponent, updateCSS, updateJS } from './preview.utils.js';

processCustomElementsManifest(customElementsManifest);

globalThis.litIssuedWarnings ??= new Set();
// Suppress the warning about Lit being in dev mode, as Storybook is not intended for production use.
globalThis.litIssuedWarnings.add(
    'Lit is in dev mode. Not recommended for production! See https://lit.dev/msg/dev-mode for more information.'
);

/** @type {import('@storybook/web-components-vite').Preview} */
const defaultConfig = {
    render: renderComponent,
    decorators: [usagePanelDecorator(), flexLayoutDecorator()],
    parameters: {
        layout: 'centered',
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

/**
 * Refreshes the stylesheets in the Storybook preview when a theme update is received from the Vite plugin.
 */
import.meta.hot?.on('arpadroid:css-refresh', payload => {
    updateCSS(payload);
});

/**
 * Reloads the preview iframe when the built JS bundle changes so the latest module script is executed.
 */
import.meta.hot?.on('arpadroid:js-refresh', payload => {
    updateJS(payload);
});

export default { ...config };
