//import { myAwesomePlugin } from 'awesome-plugin';

import { join } from 'path';
import { getProject } from '../project/projectStore.mjs';

const CWD = process.cwd();
const project = getProject();

if (!project) {
    throw new Error(
        'No project instance found. Make sure to run this script from the root of an Arpadroid project with a valid configuration.'
    );
}

await project.promise;

const base = project.path || CWD;

/** @type {import('@custom-elements-manifest/analyzer').Config} */
export default {
    globs: [join(base, 'src', '**', '*.js')],
    // exclude: ['src/foo.js'],
    outdir: join(base, 'dist'),
    dev: false,
    watch: false,
    dependencies: true,
    packagejson: false, // Output CEM path to `package.json`, defaults to true
    litelement: false,
    catalyst: false,
    fast: false,
    stencil: false,
    // plugins: [myAwesomePlugin()],
    /**
     * Resolution options when using `dependencies: true`
     * For detailed information about each option, please refer to the [oxc-resolver documentation](https://github.com/oxc-project/oxc-resolver?tab=readme-ov-file#options).
     */
    resolutionOptions: {
        extensions: ['.js', '.ts'],
        mainFields: ['module', 'main'],
        conditionNames: ['import', 'require'],
        alias: {}
        // ... other oxc-resolver options
    }
};
