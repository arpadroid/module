/** @type { import('@storybook/web-components').Preview } */
import { mergeObjects } from '../utils/object.util.js';
import { usagePanelDecorator } from './decorators.js';
import flexLayoutDecorator from './layouts/flexLayout.jsx';

const defaultConfig = {
    decorators: [usagePanelDecorator(), flexLayoutDecorator()],
    parameters: {
        layout: 'centered', //'centered' | 'fullscreen' | 'padded'
        options: {
            storySort: {}
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i
            }
        }
    }
};
const config = JSON.parse(process?.env?.PROJECT_CONFIG ?? '{}')?.storybook?.preview ?? {};
const preview = mergeObjects(defaultConfig, config);
export default preview;
