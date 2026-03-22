/**
 * @typedef {import('@storybook/web-components-vite').StoryFn} StoryFn
 */

/**
 * Bootstraps the app.
 * @param {() => void} callback
 * @returns {StoryFn}
 */
export function bootstrapDecorator(callback) {
    let initialized = false;
    return story => {
        const _story = typeof story === 'function' ? story() : story;
        if (!initialized) {
            if (typeof callback === 'function') {
                callback();
            }
            initialized = true;
        }
        return _story;
    };
}
