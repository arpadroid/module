declare module 'rollup-plugin-peer-deps-external' {
    import { Plugin } from 'rollup';
    function peerDepsExternal(): Plugin;
    export default peerDepsExternal;
}

declare module '@rollup/plugin-terser' {
    import { Plugin } from 'rollup';
    function terser(config): Plugin;
    export default terser;
}

declare module 'rollup-plugin-watch' {
    import { Plugin } from 'rollup';
    function watch(config): Plugin;
    export default watch;
}

declare module 'rollup-plugin-copy' {
    import { Plugin } from 'rollup';
    function copy(config): Plugin;
    export default copy;
}

declare module '@rollup/plugin-multi-entry' {
    import { Plugin } from 'rollup';
    function multiEntry(): Plugin;
    export default multiEntry;
}

declare module 'rollup-plugin-typescript2' {
    import { Plugin } from 'rollup';
    function typescript(config): Plugin;
    export default typescript;
}

declare module '@rollup/plugin-json' {
    import { Plugin } from 'rollup';
    function json(): Plugin;
    export default json;
}

declare module 'rollup-plugin-polyfill-node' {
    import { Plugin } from 'rollup';
    function polyfillNode(): Plugin;
    export default polyfillNode;
}

declare module 'rollupCopy' {
    import { Plugin } from 'rollup';
    function copy(config): Plugin;
    export default copy;
}

declare module '@rollup/plugin-alias' {
    import { Plugin } from 'rollup';
    function alias(config): Plugin;
    export default alias;
}
