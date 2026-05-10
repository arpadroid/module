declare global {
    var litIssuedWarnings: Set<string> | undefined;
    interface Window {
        _storyContext?: Record<string, unknown>;
    }
}

export {};

declare module 'chokidar' {
    interface FSWatcher {
        ref(): this;
        unref(): this;
    }
}
