#!/usr/bin/env node
import { getProject, shouldLogHeading } from './scripts.util.mjs';

process.setMaxListeners(30);

getProject().build({
    logHeading: shouldLogHeading()
});
