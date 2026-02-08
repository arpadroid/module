import { basename } from 'node:path';

const cwd = process.cwd();
/** @type {import('vite').UserConfig} */
const config = {
    base: '/',
    build: {
        target: 'esnext'
    },
    esbuild: {
        target: 'esnext',
        supported: {
            // 'class-fields': true,
            // 'class-static-fields': true
        }
    },
    resolve: {
        alias: [],
        conditions: ['import', 'module', 'browser', 'default']
    },
    server: {
        fs: {
            allow: [basename(cwd), cwd, '/var/www/arpadroid', cwd + '/.storybook']
        },
        watch: {
            ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**/@types/**', '**/*.d.ts', '**/.tmp/**']
        }
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext'
        },
        exclude: ['storybook', '@storybook/web-components', 'storybook/internal/preview/runtime']
    },
    plugins: [],
    define: {}
};
export default config;
