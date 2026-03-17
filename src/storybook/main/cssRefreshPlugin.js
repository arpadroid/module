/**
 * Vite plugin that exposes a local HTTP endpoint used by the build process to notify
 * Storybook about freshly bundled theme files.
 * @returns {import('vite').Plugin}
 */
export function cssRefreshPlugin() {
    return {
        name: 'arpadroid-css-refresh',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = new URL(req.url || '/', 'http://127.0.0.1');
                if (req.method !== 'POST' || url.pathname !== '/__arpadroid/css-refresh') {
                    next();
                    return;
                }

                const themeName = url.searchParams.get('themeName') || undefined;
                server.ws.send({
                    type: 'custom',
                    event: 'arpadroid:css-refresh',
                    data: { themeName }
                });

                res.statusCode = 204;
                res.end();
            });
        }
    };
}

/**
 * Notifies the Storybook child process that a theme stylesheet changed.
 * Is a no-op when Storybook is not running or the notification cannot be delivered.
 * @param {string} [themeName]
 * @param {number} [port=6006]
 */
export async function sendCssRefresh(themeName, port = 6006) {
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
