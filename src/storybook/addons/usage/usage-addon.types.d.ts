import { Plugin } from 'prettier';

export type StorybookToolConfigType = {
    storybook?: {
        preview?: Record<string, unknown>;
    };
};

export type StoryContextType = Record<string, unknown>;

export type PrettyPrintOptions = {
    parser?: string;
    plugins?: Plugin[];
};
