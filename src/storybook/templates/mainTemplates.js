/**
 * @typedef {import('storybook/internal/types').Options} Options
 */

import { getProject } from '../../../scripts/scripts.util.mjs';
import Project from '../../project/project.mjs';

const html = String.raw;

/**
 * Renders the content for the HTML head.
 * @param {string | undefined} head
 * @param {Options} options
 * @param {Project} [project]
 * @returns {Promise<string>}
 */
export async function renderStorybookHead(head, options, project = getProject()) {
    if (!(project instanceof Project)) {
        throw new Error('Invalid project instance passed to renderArpadroidHead');
    }
    await project.promise;
    const config = await project.getBuildConfig();
    const fn = config?.storybook?.previewHead;
    const content =
        (typeof fn === 'function' && fn(head, options, project)) ||
        html`<link rel="preload" href="/i18n/en.json" as="fetch" type="application/json" crossorigin />
            <link rel="stylesheet" href="/material-symbols/outlined.css" onerror="this.remove()" />
            <link rel="stylesheet" href="/themes/default/default.bundled.final.css" onerror="this.remove()" />
            <link
                id="mobile-styles"
                rel="stylesheet"
                href="/themes/mobile/mobile.bundled.final.css"
                disabled
                onerror="this.remove()"
            />
            <link
                id="dark-styles"
                rel="stylesheet"
                href="/themes/dark/dark.bundled.final.css"
                disabled
                onerror="this.remove()"
            />
            <script src="/arpadroid-polyfills.js" onerror="this.remove()"></script>
            <script type="module" src="/arpadroid-${project.name}.js" onerror="this.remove()"></script> `;
    return `${head || ''}${content}`;
}

/**
 * Renders the content for the HTML body.
 * @param {string | undefined} body
 * @param {Options} options
 * @param {Project} [project]
 * @returns {Promise<string>}
 */
export async function renderStorybookBody(body, options, project = getProject()) {
    if (!(project instanceof Project)) {
        throw new Error('Invalid project instance passed to renderArpadroidHead');
    }
    await project.promise;
    const config = await project.getBuildConfig();
    const fn = config?.storybook?.previewBody;
    const extraBody = (typeof fn === 'function' && fn(body, options, project)) || html`${body || ''}`;
    return `${body || ''}${extraBody}`;
}
