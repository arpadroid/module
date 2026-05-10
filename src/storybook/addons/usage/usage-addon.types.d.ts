import { Plugin } from 'prettier';
import { ArpaElementType } from '../../../types.js';
import { StoryContext } from '@storybook/web-components-vite';
import { Renderer } from 'storybook/internal/csf';

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

export type UsagePayloadType = {
    element: ArpaElementType;
    story: StoryContext<Renderer>;
    code: string;
};
