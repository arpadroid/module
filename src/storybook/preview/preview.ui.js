/// <reference types="vite/client" />

import { mergeObjects } from '@arpadroid/tools-iso';
import { usagePanelDecorator } from './decorators.js';
import flexLayoutDecorator from '../layouts/flexLayout.jsx';
import previewConfig from 'virtual:preview-config';

globalThis.litIssuedWarnings ??= new Set();
// Suppress the warning about Lit being in dev mode, as Storybook is not intended for production use.
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

/**
 * Refreshes the stylesheets in the Storybook preview when a theme update is received from the Vite plugin.
 */
import.meta.hot?.on('arpadroid:css-refresh', payload => {
    const update = /** @type {{ themeName?: string } | undefined} */ (payload);
    const themeName = update?.themeName;
    /** @type {NodeListOf<HTMLLinkElement>} */
    const links = document.querySelectorAll('link[rel="stylesheet"]');

    links.forEach(link => {
        const url = new URL(link.href);
        if (!themeName || url.pathname.includes(`/themes/${themeName}/`)) {
            url.searchParams.set('_t', String(Date.now()));
            link.href = url.toString();
        }
    });
});

export default { ...config };
