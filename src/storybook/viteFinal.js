import { basename } from 'node:path';

const cwd = process.cwd();
/** @type {import('vite').UserConfig} */
const config = {
    base: '/',
    build: {
        target: 'esnext'
    },
    esbuild: {
        target: 'esnext'
    },
    resolve: {
        alias: []
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
        include: ['storybook/internal/preview/runtime'],
        esbuildOptions: {
            target: 'esnext'
        },
        exclude: ['storybook']
    },
    plugins: [],
    define: {}
};
export default config;
