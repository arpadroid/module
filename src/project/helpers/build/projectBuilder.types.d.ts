import Project from '../../project.mjs';

export type DependencyPointerType = {
    name: string;
    path: string;
    project?: Project;
};

export type GetDependenciesOptionsType = {
    sort?: string[];
    maxDepth?: number;
};
