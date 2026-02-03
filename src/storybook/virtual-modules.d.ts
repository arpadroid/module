/**
 * Type declarations for Vite virtual modules used in Storybook configuration.
 */
declare module 'virtual:preview-config' {
    const previewConfig: Record<string, unknown>;
    export default previewConfig;
}
