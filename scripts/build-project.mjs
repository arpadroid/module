#!/usr/bin/env node
import { getProjectCI, shouldLogHeading } from '../src/project/projectStore.mjs';

process.setMaxListeners(30);

getProjectCI().build({
    logHeading: shouldLogHeading()
});
