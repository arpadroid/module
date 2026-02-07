const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Express middleware for Storybook to proxy API requests to the backend server.
 * @param {import('express').Router} router
 */
module.exports = function expressMiddleware(router) {
    router.use(
        '/api',
        createProxyMiddleware({
            // eslint-disable-next-line sonarjs/no-clear-text-protocols
            target: 'http://casavaquero.local/api',
            changeOrigin: true,
            pathRewrite: {
                '^/api': ''
            }
        })
    );
};
