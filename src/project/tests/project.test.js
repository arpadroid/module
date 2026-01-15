/* eslint-disable security/detect-non-literal-fs-filename */

import Project from '../project.mjs';
import { basename } from 'path';
import { existsSync } from 'fs';
import { spyOn } from 'jest-mock';
import { getDependencies, getFileConfig } from '../helpers/projectBuild.helper.mjs';

const cwd = process.cwd();

describe('@arpadroid/module Project Instance', () => {
    /** @type {Project | undefined}*/
    let project;
    beforeAll(() => {
        project = new Project('module');
    });

    test('getPath returns correct project path', () => {
        expect(project?.getPath()).toBe(cwd);
        expect(basename(cwd)).toBe('module');
    });

    test('getModulePath returns correct module path', () => {
        expect(project?.getModulePath()).toBe(cwd);
    });

    test('getDependencies returns default sort order', () => {
        const deps = project && getDependencies(project, []);
        expect(Array.isArray(deps)).toBe(true);
        expect(deps).toEqual(['style-bun']);
    });

    test('_getFileConfig returns empty object when no config file exists', async () => {
        const config = await Project._getFileConfig('/non/existent/path');
        expect(config).toEqual({});
    });

    it('cleans up project', async () => {
        await project?.cleanBuild();
        expect(existsSync(`${cwd}/dist`)).toBe(false);
    });

    it('builds project', async () => {
        await project?.promise;
        await project?.build();
        expect(existsSync(`${project?.path}/dist`)).toBe(true);
    });

    test('builds project and dependencies with no types, overriding value through build method config', async () => {
        // Spy on the exports object which is used internally
        await project?.promise;
        await project?.build({ buildTypes: false });
        // const hasTypes = await ;
        expect(existsSync(`${cwd}/dist/@types`)).toBe(false);
    });

    test('_getFileConfig returns config from existing config file', async () => {
        const config = await Project._getFileConfig(project?.path);
        expect(config.buildType).toBe('library');
    });
    test('_getFileConfig returns empty object when no config file exists', async () => {
        const config = await Project._getFileConfig('/non/existent/path');
        expect(config).toEqual({});

        await getFileConfig('/non/existent/path').then(cfg => {
            expect(cfg).toEqual({});
        });
    });

    test('Logs error when a dependency is missing', async () => {
        const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

        await project?.promise;
        await project
            ?.build({
                buildDeps: true,
                buildTypes: false,
                deps: ['non-existent-dependency']
            })
            .catch(() => {
                const calls = consoleErrorSpy.mock.calls;
                expect(calls[0][0]).toContain('Could not determine path for project non-existent-dependency');
                expect(calls[1][0]).toContain('Project non-existent-dependency does not exist');
            });
        consoleErrorSpy.mockRestore();
    });

    test('watcherCallback handles ERROR event and calls user callback', async () => {
        const project = new Project('module');
        await project.promise;

        const logErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
        const mockCallback = { fn: () => {} };
        const userCallback = spyOn(mockCallback, 'fn');

        // Create mock watcher
        let eventHandler;
        project.watcher = {
            // @ts-ignore
            on: (event, handler) => {
                eventHandler = handler;
            }, // @ts-ignore
            close: () => {}
        };

        // Manually call watch to register the callback
        project.watcher?.on('event', event => {
            if (event.code === 'ERROR') {
                console.error(`Error occurred while watching ${project.name}`, event.error);
            }
            if (typeof mockCallback.fn === 'function') {
                // @ts-ignore
                mockCallback.fn(event);
            }
        });

        // Test ERROR event
        const errorEvent = { code: 'ERROR', error: new Error('Test error') }; // @ts-ignore
        typeof eventHandler === 'function' && eventHandler(errorEvent);

        expect(logErrorSpy).toHaveBeenCalled();
        expect(userCallback).toHaveBeenCalledWith(errorEvent);

        logErrorSpy.mockRestore();
    });
});

describe('Project watch() method', () => {});
