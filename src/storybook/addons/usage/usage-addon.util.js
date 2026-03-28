/**
 * @typedef {import('../../../types.js').ArpaElementType} ArpaElementType
 * @typedef {import('storybook/internal/types').StoryContext} StoryContext
 * @typedef {import('@storybook/web-components-vite').StoryFn} StoryFn
 * @typedef {import('@storybook/web-components-vite').Args} Args
 * @typedef {import('storybook/internal/types').API_LeafEntry} API_LeafEntry
 * @typedef {import('./usage-addon.types.js').PrettyPrintOptions} PrettyPrintOptions
 */

import { attrString, mergeObjects } from '@arpadroid/tools-iso';
import { format } from 'prettier';
import htmlParser from 'prettier/parser-html';

const html = String.raw;
////////////////////////////
// #region Context API
////////////////////////////

/**
 * Returns the context object for the current story.
 * @returns {StoryContext} The story context.
 */
function getContext() {
    const _window = window.parent;
    if (!_window._storyContext) {
        _window._storyContext = {};
    }
    // @ts-ignore
    return _window._storyContext;
}

/**
 * Returns an object with data associated with the story.
 * @param {string} id
 * @returns {StoryContext}
 */
export function getStoryContext(id = '') {
    const context = getContext();
    if (id && typeof context[id] === 'undefined') {
        context[id] = {};
    }
    return /** @type {StoryContext} */ (context[id]);
}

/**
 * Sets the context object for the specified story id.
 * @param {string} id
 * @param {Record<string, unknown>} payload
 * @returns {StoryContext}
 */
export function setStoryContext(id, payload) {
    const context = getContext();
    context[id] = payload;
    return /** @type {StoryContext} */ (context[id]);
}

/**
 * Edits the context object for the specified story id by merging the existing data with the new payload.
 * @param {string} id
 * @param {Record<string, unknown>} payload
 * @returns {StoryContext | undefined}
 */
export function editStoryContext(id, payload) {
    const context = getContext();
    const storyContext = getStoryContext(id);
    if (storyContext) {
        context[id] = mergeObjects(storyContext, payload);
        return /** @type {StoryContext} */ (context[id]);
    }
}

/**
 * Returns the value associated with the specified key in the story context.
 * @param {string} id
 * @param {string} key
 * @returns {unknown}
 */
export function getStoryContextValue(id, key) {
    const context = getStoryContext(id) ?? {};
    return context[key];
}

/**
 * Sets the value associated with the specified key in the story context.
 * @param {string} id
 * @param {string} key
 * @param {unknown} value
 * @returns {StoryContext | undefined}
 */
export function setStoryContextValue(id, key, value) {
    return editStoryContext(id, { [key]: value });
}

// #endregion

//////////////////////////////////
// #region Usage Panel
//////////////////////////////////

/**
 * Renders an HTML string with attributes.
 * @param {string} code
 * @param {PrettyPrintOptions} [options]
 * @returns {Promise<string>} The rendered HTML string.
 */
export async function prettyPrint(code, options) {
    const { parser = 'html', plugins = [htmlParser] } = options || {};
    return format(String(code), {
        parser,
        plugins
    })
        .then(formatted => formatted)
        .catch(err => {
            console.error('Prettier error formatting HTML:', err);
            return Promise.reject(err);
        });
}

/**
 * Returns the usage context for the specified story, which contains the rendered element and story configuration.
 * @param {StoryContext} story
 * @returns {{ element: ArpaElementType; story: StoryContext } | unknown} The usage context or undefined if not found.
 */
export function getUsageContext(story) {
    const usageContext = getStoryContextValue(story.id, 'usage');
    if (!usageContext) {
        console.warn(`Usage context not found for story with id ${story.id}`);
    }
    return usageContext;
}

/**
 * Returns the usage code for the specified story.
 * @param {ArpaElementType} element
 * @param {Record<string, unknown>} [args]
 * @returns {string} The usage code or element associated with the story.
 */
export function getCode(element, args = {}) {
    let code = element?.toString();
    if (typeof element?.tagName !== 'undefined') {
        // @ts-ignore
        const attr = args || {};
        const { content = '' } = attr;
        delete attr.content;
        const tag = element.tagName?.toLowerCase();
        const attrStr =
            typeof element.renderAttributes === 'function'
                ? element.renderAttributes(attr)
                : attrString(attr);

        code = html`<${tag} ${attrStr}>${content}</${tag}>`;
    }
    return code || '';
}

/**
 * Returns the usage code for the specified story.
 * @param {ArpaElementType} element
 * @param {StoryContext} story
 * @param {{pretty?: boolean}} [config]
 * @returns {Promise<string>} The usage code or element associated with the story.
 */
export async function getUsageCode(element, story, config) {
    const { pretty = true } = config || {};
    const code = getCode(element, story.args);
    return !pretty ? code : await prettyPrint(code);
}

/**
 * A decorator that sets the usage panel for the story.
 * @returns {StoryFn}
 */
export function usagePanelDecorator() {
    return (story, config) => {
        const _story = typeof story === 'function' ? story() : story;
        setStoryContextValue(config.id, 'usage', {
            element: _story,
            story: config
        });
        return _story;
    };
}

// #endregion
