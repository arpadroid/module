/**
 * Type declarations for Vite virtual modules used in Storybook configuration.
 */
declare module 'virtual:preview-config' {
    const previewConfig: Record<string, unknown>;
    export default previewConfig;
}

declare module 'virtual:custom-elements-manifest' {
    const manifest: Record<string, unknown> | undefined;
    export default manifest;
}
