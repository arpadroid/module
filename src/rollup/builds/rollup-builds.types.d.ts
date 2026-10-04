import { InputPluginOption, OutputOptions, Plugin, RollupOptions } from 'rollup';
import type Project from '../../project/project.mjs';
import { ThemesBundlerConfigType } from '@arpadroid/style-bun';
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
import { ManifestModeType } from '../../project/helpers/manifest/projectManifest.helper.types.js';

type TestMatchContentType = string | string[];
type TestMatchType = TestMatchContentType | (() => Promise<TestMatchContentType>);
type StorybookPreviewType = Record<string, unknown>;
type StorybookOptionsType = object;

export type BuildConfigType = {
    aliases?: string[] | AliasType[];
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
    hasPlugin?: {
        somePlugin?: boolean;
    };
    processBuilds?: (builds: RollupOptions[]) => void;
    requireDeps?: boolean;
    skipTypesBuild?: string[];
    slim?: boolean;
    skipLibCheck?: boolean;
    storybook_port?: number;
    storybook?: StorybookConfigType;
    style_patterns?: string | string[];
    test_browsers?: string;
    turbo?: boolean;
    themes?: ThemesBundlerConfigType[];
    themesPath?: string;
    verbose?: boolean;
    watch?: boolean;
    watchCallback?: (payload: unknown) => void;
};

export type AliasType = {
    find: string | RegExp;
    replacement: string;
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
    mode?: ManifestModeType;
    useTypesChecker?: boolean;
    skipIfExists?: boolean;
    buildDeps?: boolean;
};

export type JestConfigType = {
    testMatch?: TestMatchType;
    environment?: 'jsdom' | 'node';
};

export type StorybookConfigType = {
    stories?: TestMatchType;
    preview?: StorybookPreviewType;
    previewHead?: (head: string | undefined, options: StorybookOptionsType, project: Project) => string;
    previewBody?: (body: string | undefined, options: StorybookOptionsType, project: Project) => string;
    managerCache?: boolean;
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
