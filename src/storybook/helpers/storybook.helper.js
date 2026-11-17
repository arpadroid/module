/**
 * @typedef {import('@storybook/web-components-vite').StoryObj} Story
 */

import { addons as Addons } from 'storybook/preview-api';
import { UPDATE_GLOBALS as update_globals } from 'storybook/internal/core-events';

/** @type {Story['parameters']} */
export const defaultParams = {
    interactions: { disable: true },
    chromatic: { disable: true }
};

/** @type {Story['parameters']} */
export const testParams = {
    controls: { disable: true },
    interactions: { default: true },
};

/** @type {typeof import('storybook/preview-api').addons} */
export const addons = Addons;

export const UPDATE_GLOBALS = update_globals;
