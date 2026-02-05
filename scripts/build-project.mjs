#!/usr/bin/env node
import { getProject, shouldLogHeading } from '../src/project/projectStore.mjs';

process.setMaxListeners(30);

getProject().build({
    logHeading: shouldLogHeading()
});
