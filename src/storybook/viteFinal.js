import { basename } from 'node:path';

const cwd = process.cwd();
/** @type {import('vite').UserConfig} */
const config = {
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
        alias: [
            // Example alias for backward compatibility
            // {
            //     find: '@old-module/path',
            //     replacement: '/absolute/path/to/src/new-module/path'
            // }
        ]
    },
    server: {
        fs: {
            allow: [basename(cwd), cwd, '/var/www/arpadroid']
        },
        watch: {
            ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**/@types/**', '**/*.d.ts', '**/.tmp/**']
        }
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext'
        }
    },
    define: {}
};
export default config;
