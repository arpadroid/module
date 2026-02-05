import { join } from 'path';
let cwd = process.cwd();
if (!cwd.endsWith('test-project')) {
    cwd = join(cwd, 'test/test-project');
}

export const TEST_PROJECT_PATH = cwd;
