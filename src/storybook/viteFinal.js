import { join } from 'path';

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
        exclude: ['storybook', 'react/jsx-runtime']
    },
    plugins: [],
    define: {}
};
export default config;
