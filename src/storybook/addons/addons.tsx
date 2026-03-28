import React from 'react';
import { addons, types } from 'storybook/manager-api';
import UsageComponent from './usage/components/usageWrapper.js';

export function usagePanelAddon() {
    addons.register('usage/panel', api => {
        addons.add('usage/panel', {
            title: 'Usage',
            paramKey: 'usage',
            type: types.PANEL,
            render: props => <UsageComponent api={api} active={props.active} />
        });
    });
}
