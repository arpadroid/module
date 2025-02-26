import { InputPluginOption, OutputOptions, Plugin, RollupOptions } from 'rollup';
import type Project from '../../projectBuilder/project.mjs';
import { RollupPlugin } from './rollup-builds.mjs';
import { Preview } from '@storybook/web-components';

export type BuildConfigType = {
    aliases?: string[];
    basePath?: string;
    buildDeps?: boolean;
    buildI18n?: boolean;
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
    storybook?: { 
        preview?: Preview 
    };
    style_patterns?: string | string[];
    watch?: boolean;
};

export type BuildInterface = {
    build: RollupOptions[];
    appBuild: RollupOptions;
    typesBuild: RollupOptions;
    project: Project;
    buildConfig: BuildConfigType;
    plugins: InputPluginOption;
    Plugins: Record<string, RollupPlugin>;
    output: OutputOptions | OutputOptions[] | undefined;
};
