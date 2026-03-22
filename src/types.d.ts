export type {
    CompileTypesType,
    ProjectTestConfigType,
    ProjectCliArgsType,
    ProjectTestResponseType,
    ProjectTestSuiteResponseType,
    ProjectTestCountType
} from './project/project.types.d.ts';

export type {
    BuildConfigType,
    BuildInterface,
    BuildHookType,
    BuildHookNameType,
    BuildHooksType,
    BuildHookReturnType,
    StorybookConfigType,
    TestMatchContentType
} from './rollup/builds/rollup-builds.types.d.ts';

export type {
    StorybookToolConfigType,
    StoryContextType
} from './storybook/addons/usage/usage-addon.types.js';

export type { DependencyPointerType } from './project/helpers/build/projectBuilder.types.d.ts';

export type ArpaElementType = HTMLElement & {
    _config: Record<string, unknown>;
    _childNodes: Node[];
    getDefaultConfig: () => Record<string, unknown>;
    addConfig: (config: Record<string, unknown>) => void;
};
