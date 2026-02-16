import { getAllDependencies } from '../src/project/helpers/build/projectBuild.helper.mjs';
import { getProject } from '../src/project/projectStore.mjs';
const project = getProject();
if (!project) {
    console.error(
        'No project instance found. Make sure to run this script from the root of an Arpadroid project with a valid configuration.'
    );
    process.exit(1);
}
const deps = await getAllDependencies(project);
/** @type {import('../src/project/helpers/projectBuilder.types').DependencyProjectPointerType[]} */
const projects = [{ name: project.name, instance: project, path: project.path }, ...deps];

console.log('projects', projects);
// getProject().clean({
//     logHeading: false
// });
