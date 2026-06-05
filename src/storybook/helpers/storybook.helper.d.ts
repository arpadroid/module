import { StoryObj } from '@storybook/web-components-vite';
declare module '@arpadroid/module/storybook/helper' {
    export const defaultParams: StoryObj['parameters'];
    export const testParams: StoryObj['parameters'];
}
