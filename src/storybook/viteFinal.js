import { join, resolve } from 'path';

export const MODULE_ROOT = resolve(import.meta.dirname, '../..');
const cwd = process.cwd();
/** @type {import('vite').UserConfig} */
const config = {
    base: '/',
    build: {
        target: 'esnext'
    },
    resolve: {
        alias: []
    },
    server: {
        fs: {
            allow: [cwd, join('/var', 'www', 'arpadroid'), join(cwd, '.storybook')]
        },
        watch: {
            ignored: [
                /node_modules\/(?!@arpadroid\/)/,
                '**/.git/**',
                '**/dist/**/@types/**',
                '**/*.d.ts',
                '**/.tmp/**'
            ]
        }
    },

    optimizeDeps: {
        exclude: ['storybook'],
        include: ['@testing-library/dom', 'aria-query', 'chai']
    },
    plugins: [],
    define: {}
};
export default config;
