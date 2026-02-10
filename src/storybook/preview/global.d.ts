// Augment globalThis with a property used by storybook preview

declare global {
    var litIssuedWarnings: Set<string> | undefined;
    interface Window {
        _storyContext?: Record<string, unknown>;
    }
}

export {};
