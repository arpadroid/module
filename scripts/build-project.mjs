#!/usr/bin/env node
import { getProject, shouldLogHeading } from './scripts.util.mjs';

getProject().build({
    logHeading: shouldLogHeading()
});
