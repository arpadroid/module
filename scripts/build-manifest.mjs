#!/usr/bin/env node
import { log } from '@arpadroid/logger';
import { buildCustomElementsManifest } from '../src/project/helpers/manifest/projectManifest.helper.mjs';
import { getProject } from '../src/project/projectStore.mjs';

const project = getProject(undefined, undefined, { throwError: true });
await project.promise;

await buildCustomElementsManifest(project, undefined, {
    bypassCheck: true
});

log.success('Custom Elements Manifest built successfully.');
