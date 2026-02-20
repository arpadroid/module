#!/usr/bin/env node
/**
 * @typedef {import('../src/project/helpers/projectBuilder.types').DependencyPointerType} DependencyPointerType
 */
import { getAllDependencies } from '../src/project/helpers/build/projectBuild.helper.mjs';
import { getProject } from '../src/project/projectStore.mjs';
import { log } from '@arpadroid/logger';

const project = getProject(undefined, undefined, { throwError: true });
await project.promise;
const deps = await getAllDependencies(project);
/** @type {DependencyPointerType[]} */
const projects = [
    ...deps,
    {
        name: project.name,
        project,
        path: project.path
    }
];

for (const { project: proj } of projects) {
    await proj.clean();
}

log.success('Initialization successful!');
