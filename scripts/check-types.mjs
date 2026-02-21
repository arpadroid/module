#!/usr/bin/env node
import { checkTypes } from '../src/project/helpers/types/projectTypes.helper.mjs';
import { getProjectCI } from '../src/project/projectStore.mjs';

const project = getProjectCI();
await checkTypes(project);
