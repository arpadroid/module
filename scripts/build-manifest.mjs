#!/usr/bin/env node
/**
 * @typedef {import('../src/project/helpers/manifest/projectManifest.helper.types.js').ManifestModeType} ManifestModeType
 * @typedef {import('../src/project/helpers/manifest/projectManifest.helper.types.js').BuildManifestConfigType} BuildManifestConfigType
 */
import { log } from '@arpadroid/logger';
import { buildCustomElementsManifest } from '../src/project/helpers/manifest/projectManifest.helper.mjs';
import { getProjectCI } from '../src/project/projectStore.mjs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = /** @type {BuildManifestConfigType} */ (yargs(hideBin(process.argv)).argv);
const { mode = 'standard', debug = false, minify = true } = argv;
const project = getProjectCI();
await project.promise;

await buildCustomElementsManifest(project, { bypassCheck: true, debug, mode, minify }).catch(err => {
    log.error('Error building Custom Elements Manifest:', err);
    process.exit(1);
});
