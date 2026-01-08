import { InputPluginOption, OutputOptions, Plugin, RollupOptions } from 'rollup';
import type Project from '../../project/project.mjs';
// import { RollupPlugin } from './rollup-builds.mjs';
import { Plugin } from 'rollup';
import { Preview } from '@storybook/web-components';

import { bundleStats } from 'rollup-plugin-bundle-stats';
import gzipPlugin from 'rollup-plugin-gzip';
import { dts } from 'rollup-plugin-dts';
import multiEntry from '@rollup/plugin-multi-entry';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import rollupAlias from '@rollup/plugin-alias';
import rollupWatch from 'rollup-plugin-watch';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import { visualizer } from 'rollup-plugin-visualizer';
import typescript from 'rollup-plugin-typescript2';
import { ThemesBundlerConfigType } from '@arpadroid/style-bun';

export type StorybookConfigType = {
    preview?: Preview;
    previewHead?: (head) => string;
    previewBody?: (body) => string;
};

export type BuildConfigType = {
    aliases?: string[];
    basePath?: string;
    buildDeps?: boolean;
    buildI18n?: boolean;
    buildType?: 'uiComponent' | 'library';
    buildJS?: boolean;
    buildStyles?: boolean;
    buildTypes?: boolean;
    deps?: string[];
    external?: string[];
    file?: string;
    isDependency?: boolean;
    logHeading?: boolean;
    logo?: string;
    minify?: boolean;
    parent?: string;
    path?: string;
    plugins?: Plugin[];
    processBuilds?: (builds: RollupOptions[]) => void;
    slim?: boolean;
    storybook?: StorybookConfigType;
    storybook_port?: number;
    style_patterns?: string | string[];
    watch?: boolean;
    verbose?: boolean;
    themesPath?: string;
    themes?: ThemesBundlerConfigType[];
};

export type BuildInterface = {
    build: RollupOptions[];
    appBuild: RollupOptions;
    typesBuild: RollupOptions;
    project: Project;
    buildConfig: BuildConfigType;
    plugins: InputPluginOption;
    Plugins: {
        bundleStats: typeof bundleStats;
        gzipPlugin: typeof gzipPlugin;
        dts: typeof dts;
        multiEntry: typeof multiEntry;
        nodeResolve: typeof nodeResolve;
        json: typeof json;
        peerDepsExternal: typeof peerDepsExternal;
        alias: typeof rollupAlias;
        watch: typeof rollupWatch;
        terser: typeof terser;
        copy: typeof copy;
        visualizer: typeof visualizer;
        typescript: typeof typescript;
        debugPlugin: Plugin;
    };
    output: OutputOptions | OutputOptions[] | undefined;
};
