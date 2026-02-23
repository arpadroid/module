declare global {
    var litIssuedWarnings: Set<string> | undefined;
    interface Window {
        _storyContext?: Record<string, unknown>;
    }
}

export {};
