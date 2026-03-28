import React, { JSX } from 'react';
import { Renderer } from 'storybook/internal/types';
import { AddonPanel } from 'storybook/internal/components';
import { Source } from '@storybook/addon-docs/blocks';
import { ArpaElementType } from '../../../../types.js';
import { StoryContext } from '@storybook/web-components-vite';

export type DefaultUsagePropsType = {
    element: ArpaElementType;
    story: StoryContext<Renderer>;
    code: string;
    active?: boolean;
};

export default function DefaultUsage({ code, active }: DefaultUsagePropsType): JSX.Element | string {
    return (
        <AddonPanel active={Boolean(active)}>
            <Source code={code} language="html" dark />
        </AddonPanel>
    );
}
