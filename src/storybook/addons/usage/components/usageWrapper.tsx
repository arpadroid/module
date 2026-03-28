import React, { JSX, useEffect, useState } from 'react';
import { Renderer } from 'storybook/internal/types';
import { getStoryContextValue, getUsageCode } from '../usage-addon.util.js';
import { API } from 'storybook/manager-api';
import { ArpaElementType } from '../../../../types.js';
import { StoryContext } from '@storybook/web-components-vite';
import DefaultUsage from './defaultUsage.js';

export type UsagePayloadType = {
    element: ArpaElementType;
    story: StoryContext<Renderer>;
    code: string;
};

export type UsagePropsType = {
    api: API;
    active?: boolean;
};

export type UsageRenderPayload = UsagePayloadType & {
    customUsage: React.FC<UsagePayloadType>;
    code: string;
};

export default function Usage({ api, active }: UsagePropsType): JSX.Element | string {
    const story = api.getCurrentStoryData();
    const [payload, _setPayload] = useState<UsageRenderPayload | null>(null);

    useEffect(() => {
        const usagePayload = story.id && (getStoryContextValue(story.id, 'usage') as UsagePayloadType | null);
        if (!usagePayload) return;
        const { element, story: config } = usagePayload;

        async function getPayload() {
            const code = await getUsageCode(element, config);
            return _setPayload({
                code,
                story: config,
                element,
                customUsage: config.parameters?.usage
            });
        }

        getPayload();
        api.on('storyArgsUpdated', getPayload);

        return () => api.off('storyArgsUpdated', getPayload);
    }, [story]);

    const CustomUsage = payload?.customUsage;

    if (CustomUsage) {
        return <CustomUsage code={payload?.code} element={payload?.element} story={payload?.story} />;
    }
    if (payload?.code) {
        return (
            <DefaultUsage
                code={payload.code}
                element={payload.element}
                story={payload.story}
                active={active}
            />
        );
    }

    return 'No usage information available for this story.';
}
