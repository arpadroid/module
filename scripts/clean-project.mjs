#!/usr/bin/env node

import { getProject } from '../src/project/projectStore.mjs';

getProject().clean();
