const { createProxyMiddleware } = require('http-proxy-middleware');

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
