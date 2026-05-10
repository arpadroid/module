import React, { JSX, use, useEffect } from 'react';
import { Renderer } from 'storybook/internal/types';
import { AddonPanel } from 'storybook/internal/components';
import { Source } from '@storybook/addon-docs/blocks';
import { ArpaElementType } from '../../../../../types.js';
import { StoryContext } from '@storybook/web-components-vite';
import './usage.css';

export type UsagePropsType = {
    element: ArpaElementType;
    story: StoryContext<Renderer>;
    code: string;
    active?: boolean;
};

export default function Usage({ code, active }: UsagePropsType): JSX.Element | string {
    useEffect(() => {
        console.log('Usage component rendered with code:', code);
    }, [code]);
    return (
        <AddonPanel active={Boolean(active)}>
            <div className="usage-panel">
                <div className="usage-panel__code-block">
                    <details open>
                        <summary>
                            <h3 className="usage-panel__code-block__title">HTML</h3>
                        </summary>
                        <Source code={code} language="html" dark />
                    </details>
                </div>
            </div>
        </AddonPanel>
    );
}
