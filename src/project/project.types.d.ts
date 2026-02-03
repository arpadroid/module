/* eslint-disable @typescript-eslint/no-explicit-any */
export type CompileTypesType = {
    filePattern?: string;
    inputDir?: string;
    destination?: string;
    prependFiles?: string[];
};

export type ProjectCliArgsType = Record<string, any> & {
    watch?: boolean;
    slim?: boolean;
    deps?: string;
    minify?: string;
    storybook?: number;
    'style-patterns'?: string;
    verbose?: boolean;
    noTypes?: boolean;
};

export type ProjectTestConfigType = Record<string, any> & {
    ci?: boolean;
    watch?: boolean;
    jest?: boolean;
    build?: boolean;
    browsers?: string;
    storybook?: boolean;
    port?: number;
    query?: string;
};

export type DeferredOperationType = {
    name?: string;
    description?: string;
    operation: () => Promise<any>;
};
