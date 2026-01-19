if (typeof jest !== 'undefined') {
    globalThis.jest = jest;
    if (typeof global !== 'undefined') {
        global.jest = jest;
    }
} else {
    const { jest: jestGlobal } = require('@jest/globals');
    globalThis.jest = jestGlobal;
    if (typeof global !== 'undefined') {
        global.jest = jestGlobal;
    }
}
