#!/usr/bin/env node
import { log } from '@arpadroid/logger';
import { buildCustomElementsManifest } from '../src/project/helpers/manifest/projectManifest.helper.mjs';
import { getProjectCI } from '../src/project/projectStore.mjs';

const project = getProjectCI();
await project.promise;

await buildCustomElementsManifest(project, undefined, {
    bypassCheck: true
});

log.success('Custom Elements Manifest built successfully.');
