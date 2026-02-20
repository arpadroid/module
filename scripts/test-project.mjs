#!/usr/bin/env node
import { getProject, shouldLogHeading } from '../src/project/projectStore.mjs';
process.setMaxListeners(20);
getProject(undefined, undefined, { throwError: true }).test({
    logHeading: shouldLogHeading()
});
