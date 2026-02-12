import { install } from './install/install.helper.js';

/** @type {import("./types.js").BuildConfigType} */
const config = {
    buildType: 'library',
    buildTypes: true,
    buildStyles: true,
    style_patterns: ['storybook'],
    storybook_port: 6000,
    buildJS: true,
    logo: `           ┓    • ┓        ┓  ┓  
  ┏┓┏┓┏┓┏┓┏┫┏┓┏┓┓┏┫  ┏┳┓┏┓┏┫┓┏┃┏┓
  ┗┻┛ ┣┛┗┻┗┻┛ ┗┛┗┗┻  ┛┗┗┗┛┗┻┗┻┗┗ 
------┛----------------------------`,
    hooks: {
        onBuildEnd: async (project) => {
            return await install(project);
        }
    }
};

export default config;
