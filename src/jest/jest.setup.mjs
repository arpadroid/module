// Minimal ESM Jest setup for the module project
// Ensures `jest` is available as a global for tests that call jest.useRealTimers()
import { jest as jestGlobal } from '@jest/globals';

globalThis.__JEST_SETUP = true;
globalThis.jest = jestGlobal;
if (typeof global !== 'undefined') global.jest = jestGlobal;
