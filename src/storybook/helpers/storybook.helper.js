/**
 * @typedef {import('@storybook/web-components-vite').StoryObj} Story
 */

/** @type {Story['parameters']} */
export const defaultParams = {
    interactions: { disable: true },
    chromatic: { disable: true }
};

/** @type {Story['parameters']} */
export const testParams = {
    controls: { disable: true },
    interactions: { default: true }
};
