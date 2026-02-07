export type ResolutionType = {
    find?: string | RegExp;
    replacement: string;
};

export type ResolutionTypes = Record<string, ResolutionType | string>;
