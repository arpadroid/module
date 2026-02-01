// Check if jest is already injected globally by Jest
if (typeof jest === 'undefined') {
    // Jest should inject globals when injectGlobals: true
    // If jest is still undefined, we need to manually inject it
    try {
        if (typeof require !== 'undefined') {
            const { jest: jestGlobal } = require('@jest/globals');
            globalThis.jest = jestGlobal;
            if (typeof global !== 'undefined') {
                global.jest = jestGlobal;
            }
        }
    } catch (/** @type {any} */ err) {
        // If require is not available, Jest globals should already be injected
        console.warn('Could not manually inject jest globals:', err.message);
    }
} else {
    // Ensure jest is available on globalThis and global
    globalThis.jest = jest;
    if (typeof global !== 'undefined') {
        global.jest = jest;
    }
}
