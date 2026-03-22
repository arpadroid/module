import { logTask } from '@arpadroid/logger';
import { isHTTPServerRunning } from '@arpadroid/tools-node';

/**
 * Sends a custom HMR event to the Storybook preview clients.
 * @param {import('vite').ViteDevServer} server
 * @param {string} event
 * @param {Record<string, unknown>} [data]
 */
function sendRefreshEvent(server, event, data = {}) {
    server.ws.send({
        type: 'custom',
        event,
        data
    });
}

/**
 * Vite plugin that exposes local HTTP endpoints used by the build process to notify
 * Storybook about refreshed CSS and JS bundles.
 * @returns {import('vite').Plugin}
 */
export function refreshPlugin() {
    return {
        name: 'arpadroid-css-refresh',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = new URL(req.url || '/', 'http://127.0.0.1');
                if (req.method !== 'POST' || !url.pathname.startsWith('/__arpadroid/')) {
                    next();
                    return;
                }

                if (url.pathname === '/__arpadroid/css-refresh') {
                    const themeName = url.searchParams.get('themeName') || undefined;
                    sendRefreshEvent(server, 'arpadroid:css-refresh', { themeName });
                }

                if (url.pathname === '/__arpadroid/js-refresh') {
                    const projectName = url.searchParams.get('projectName') || undefined;
                    sendRefreshEvent(server, 'arpadroid:js-refresh', { projectName });
                }

                res.statusCode = 204;
                res.end();
            });
        }
    };
}

/**
 * Notifies the Storybook child process that a theme stylesheet changed.
 * Is a no-op when Storybook is not running or the notification cannot be delivered.
 * @param {string} projectName
 * @param {string} [themeName]
 * @param {number} [port]
 * @returns {Promise<boolean>}
 */
export async function sendCssRefresh(projectName, themeName, port = 6006) {
    if (!(await isHTTPServerRunning(port))) return false;
    logTask(projectName, `Refreshing CSS theme ${themeName}`);

    const searchParams = new URLSearchParams();
    themeName && searchParams.set('themeName', themeName);
    const endpoint = `http://127.0.0.1:${port}/__arpadroid/css-refresh?${searchParams.toString()}`;
    try {
        await fetch(endpoint, { method: 'POST' });
    } catch {
        return false;
    }

    return true;
}

/**
 * Notifies the Storybook child process that the built project bundle changed.
 * The preview iframe will reload so the fresh module script is executed again.
 * @param {string} projectName
 * @param {number} [port]
 * @returns {Promise<boolean>}
 */
export async function sendJsRefresh(projectName, port = 6006) {
    if (!(await isHTTPServerRunning(port))) return false;
    logTask(projectName, 'Refreshing JavaScript bundle...');
    const searchParams = new URLSearchParams();
    projectName && searchParams.set('projectName', projectName);
    const endpoint = `http://127.0.0.1:${port}/__arpadroid/js-refresh?${searchParams.toString()}`;
    try {
        await fetch(endpoint, { method: 'POST' });
    } catch {
        return false;
    }

    return true;
}
