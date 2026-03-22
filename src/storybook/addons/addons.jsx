/**
 * @typedef {import('../../types.js').ArpaElementType} ArpaElementType
 * @typedef {import('storybook/internal/types').API_LeafEntry} API_LeafEntry
 * @typedef {import('@storybook/web-components-vite').Args} Args
 * @typedef {API_LeafEntry & { args: Args }} StoryPayload
 */

import React, { useEffect, useState } from 'react';
import { Source } from '@storybook/addon-docs/blocks';
import { AddonPanel } from 'storybook/internal/components';
import { addons, types } from 'storybook/manager-api';
import { getUsageCode } from './usage/usage-addon.util.js';

export function usagePanelAddon() {
    addons.register('usage/panel', api => {
        addons.add('usage/panel', {
            title: 'Usage',
            paramKey: 'usage',
            type: types.PANEL,
            render: props => {
                const story = /** @type {StoryPayload} */ (api.getCurrentStoryData());
                const [code, setCode] = useState('');

                useEffect(() => {
                    getUsageCode(story).then(setCode);
                    const onArgsChanged = () => getUsageCode(story).then(setCode);
                    api.on('storyArgsUpdated', onArgsChanged);
                    return () => api.off('storyArgsUpdated', onArgsChanged);
                }, [story]);
                return (
                    (code && (
                        <AddonPanel active={Boolean(props.active)}>
                            <Source code={code} language="html" dark />
                        </AddonPanel>
                    )) ||
                    'No usage information available for this story.'
                );
            }
        });
    });
}
