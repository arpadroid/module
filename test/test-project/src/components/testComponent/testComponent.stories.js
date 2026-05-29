/**
 * @typedef {import('@storybook/web-components-vite').Meta} Meta
 * @typedef {import('@storybook/web-components-vite').StoryObj} Story
 */

/** @type {Meta} */
export default {
    title: 'Components/TestComponent',
    component: 'test-component'
};

/** @type {Story} */
export const Default = {
    render: () => '<test-component>Test Component</test-component>'
};
