/**
 * @typedef {import('../../types.js').ArpaElementType} ArpaElementType
 */
// import {attr} from ''
/**
 * Refreshes the stylesheets in the Storybook preview by appending a timestamp query parameter to the URL to bust the cache.
 * If a themeName is provided, only stylesheets with that theme name in their path will be refreshed.
 * @param {{ themeName?: string } | undefined} payload
 */
export function updateCSS(payload) {
    const themeName = payload?.themeName;
    /** @type {HTMLAnchorElement[]} */
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    links.forEach(link => {
        const url = new URL(link.href);
        if (!themeName || url.pathname.includes(`/themes/${themeName}/`)) {
            url.searchParams.set('_t', String(Date.now()));
            link.href = url.toString();
        }
    });
}

/**
 * Reloads the page when the built JS bundle changes so the latest module script is executed.
 * If a projectName is provided, only reload if the changed bundle matches the project name pattern.
 * @param {{ projectName?: string } | undefined} payload
 */
export function updateJS(payload) {
    const update = /** @type {{ projectName?: string } | undefined} */ (payload);
    const projectName = update?.projectName;
    /** @type {HTMLScriptElement | null} */
    const script = document.querySelector(`script[type="module"][src^="/arpadroid-${projectName || ''}"]`);
    if (!projectName || script) {
        window.location.reload();
    }
}

/**
 * Renders a web component for the Storybook preview by creating an instance of the specified component and applying the provided arguments as configuration.
 * @param {Record<string, unknown> & { children?: string }} args - The arguments to apply to the component instance.
 * @param {import('@storybook/web-components-vite').StoryContext} context - The Storybook story context, which contains information about the current story and component.
 * @returns {HTMLElement} The rendered component instance.
 */
export function renderComponent(args, context) {
    const componentTagName = context.component || '';
    const componentClass = customElements.get(componentTagName);
    /** @type {HTMLElement & Partial<ArpaElementType> | null} */
    let node = null;
    if (componentClass) {
        node = new componentClass(args);
    } else {
        node = document.createElement(componentTagName);
    }
    return node;
}

/**
 * Processes the custom elements manifest to keep only the necessary data for Storybook and reduce memory usage.
 * Specifically, it removes the members information from each declaration, which is not needed for Storybook's purposes.
 * @param {any} manifest
 * @returns {Promise<Record<string, unknown>>}
 */
export async function processCustomElementsManifest(manifest) {
    /** @type {Array<{declarations?: ({members?: unknown})[] }>} */
    const modules = manifest?.modules;
    modules?.forEach(mod => {
        mod.declarations?.forEach(decl => delete decl.members);
    });
    // @ts-ignore
    globalThis.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__ = manifest;
    return manifest;
}
