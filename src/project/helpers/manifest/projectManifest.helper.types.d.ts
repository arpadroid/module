import * as Schema from 'custom-elements-manifest';

export type CemSchemaType = typeof Schema;

export type ManifestModeType = 'standard' | 'storybook' | 'heavy' | 'light';

export type BuildManifestConfigType = {
    bypassCheck?: boolean;
    destinations?: string[];
    mode?: ManifestModeType;
    debug?: boolean;
    minify?: boolean;
};
