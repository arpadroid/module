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
        onBuildEnd: async (project, config) => {
            return await install(project, config);
        }
    }
};

export default config;
