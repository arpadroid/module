declare module 'custom-elements-manifest/schema' {
    export interface Module {
        kind: string;
        path: string;
        [key: string]: unknown;
    }
    export interface Package {
        schemaVersion: string;
        modules: Module[];
        [key: string]: unknown;
    }
}

declare module 'glob' {
    interface GlobFunction {
        (pattern: string | string[], options?: Record<string, unknown>): Promise<string[]>;
        sync(pattern: string | string[], options?: Record<string, unknown>): string[];
    }

    export const glob: GlobFunction;
    export function globSync(pattern: string | string[], options?: Record<string, unknown>): string[];
    export interface IOptions {
        [key: string]: unknown;
    }

    export default glob;
}
