export function flexLayoutDecorator() {
    /**
     * @param {import('@storybook/web-components-vite').StoryFn} story
     * @param {import('@storybook/web-components-vite').StoryContext} context
     */
    return (story, context) => {
        const _story = typeof story === 'function' ? story(story, context) : story;
        const layout = context.parameters.layout || 'fullscreen'; // Default to 'fullscreen'

        const root = document.querySelector('#storybook-root');
        const className = 'storybook__layout--flexColumn';

        if (layout === 'flexColumn') {
            root?.classList.add(className);
        } else {
            root?.classList.remove(className);
        }

        return _story;
    };
}

export default flexLayoutDecorator;
