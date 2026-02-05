#!/usr/bin/env node
import { getProject, shouldLogHeading } from '../src/project/projectStore.mjs';

getProject().test({
    logHeading: shouldLogHeading()
});
