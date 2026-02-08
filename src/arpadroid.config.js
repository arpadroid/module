/**
 * @typedef {import("./rollup/builds/rollup-builds.types.js").BuildConfigType} BuildConfigType
 */

import { installStorybook } from './project/helpers/projectStorybook.helper.js';


/** @type {BuildConfigType} */
const config = {
    buildType: 'library',
    buildTypes: true,
    buildStyles: true,
    style_patterns: ['storybook'],
    buildJS: true,

    logo: `           ┓    • ┓        ┓  ┓  
  ┏┓┏┓┏┓┏┓┏┫┏┓┏┓┓┏┫  ┏┳┓┏┓┏┫┓┏┃┏┓
  ┗┻┛ ┣┛┗┻┗┻┛ ┗┛┗┗┻  ┛┗┗┗┛┗┻┗┻┗┗ 
------┛----------------------------`,
    hooks: {
        onBuildEnd: async (project, config) => {
            await installStorybook(project, config);
        }
    }
};

export default config;
