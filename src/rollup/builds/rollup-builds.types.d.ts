import { InputPluginOption, OutputOptions, Plugin, RollupOptions } from 'rollup';
import type Project from '../../project/project.mjs';
import { Plugin } from 'rollup';
import { Preview } from '@storybook/web-components-vite';

import { bundleStats } from 'rollup-plugin-bundle-stats';
import gzipPlugin from 'rollup-plugin-gzip';
import { dts } from 'rollup-plugin-dts';
import multiEntry from '@rollup/plugin-multi-entry';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import rollupAlias, { Alias } from '@rollup/plugin-alias';
import rollupWatch from 'rollup-plugin-watch';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import { visualizer } from 'rollup-plugin-visualizer';
import typescript from 'rollup-plugin-typescript2';

import { ThemesBundlerConfigType } from '@arpadroid/style-bun';
import { Options } from 'storybook/internal/types';

type TestMatchContentType = string | string[];
type TestMatchType = TestMatchContentType | (() => Promise<TestMatchContentType>);

export type JestConfigType = {
    testMatch?: TestMatchType;
    environment?: 'jsdom' | 'node';
};

export type StorybookConfigType = {
    stories?: TestMatchType;
    preview?: Preview;
    previewHead?: (head: string | undefined, options: Options, project: Project) => string;
    previewBody?: (body: string | undefined, options: Options, project: Project) => string;
};

export type BuildHookReturnType = boolean | void | Promise<unknown>;

export type BuildHookType = (project: Project, payload?: Record<string, unknown>) => BuildHookReturnType;

export type BuildHookNameType = 'onBuildStart' | 'onBuildEnd' | 'test';

export type BuildHooksType = {
    onBuildStart?: BuildHookType;
    onBuildEnd?: BuildHookType;
    test?: BuildHookType;
};

export type BuildManifestType = {
    useTypesChecker?: boolean;
};

export type BuildConfigType = {
    aliases?: Alias[];
    buildDeps?: boolean;
    buildI18n?: boolean;
    buildJS?: boolean;
    buildStyles?: boolean;
    buildType?: 'uiComponent' | 'library';
    buildTypes?: boolean;
    buildManifest?: boolean;
    configPath?: string;
    copyTestAssets?: boolean;
    deferTypesBuild?: string[];
    deps?: string[];
    external?: string[];
    file?: string;
    hooks?: BuildHooksType;
    isDependency?: boolean;
    jest?: JestConfigType;
    logHeading?: boolean;
    logo?: string;
    manifest?: BuildManifestType;
    minify?: boolean;
    parent?: string;
    path?: string;
    plugins?: Plugin[];
    processBuilds?: (builds: RollupOptions[]) => void;
    requireDeps?: boolean;
    skipTypesBuild?: string[];
    slim?: boolean;
    storybook_port?: number;
    storybook?: StorybookConfigType;
    style_patterns?: string | string[];
    test_browsers?: string;
    themes?: ThemesBundlerConfigType[];
    themesPath?: string;
    verbose?: boolean;
    watch?: boolean;
    watchCallback?: (payload: unknown) => void;
};

export type BuildInterface = {
    build?: RollupOptions[];
    appBuild?: RollupOptions;
    typesBuild?: RollupOptions;
    project?: Project;
    buildConfig?: BuildConfigType;
    plugins?: InputPluginOption;
    constants?: {
        SLIM?: boolean;
        MINIFY?: boolean;
        STORYBOOK?: number;
    };
    Plugins?: {
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
    output?: OutputOptions | OutputOptions[] | undefined;
};
