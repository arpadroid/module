#!/usr/bin/env node

import { getProject } from '../src/project/projectStore.mjs';

getProject(undefined, undefined, { throwError: true }).clean();
