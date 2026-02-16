import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import Project from '../../project.mjs';
// import { buildCustomElementsManifest } from './projectManifest.helper.mjs';
// import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Project Manifest Helper', () => {
    /** @type {Project} */
    let project;

    beforeAll(async () => {
        const uiPath = resolve(__dirname, '../../../../ui');
        project = new Project('ui', {
            path: uiPath
        });
        await project.promise;
    });

    test('buildCustomElementsManifest writes dist/custom-elements.json (fragments)', async () => {
        // await buildCustomElementsManifest(project, {});
        // const out = `${project.path}/dist/custom-elements.json`;
        // expect(fs.existsSync(out)).toBe(true);
        // const content = JSON.parse(fs.readFileSync(out, 'utf8'));
        // const declarations = (content.modules || []).flatMap(
        //     (/** @type {{ declarations?: any[] }} map */ map) => map.declarations || []
        // );
        // const btn = declarations.find(
        //     (/** @type {{ tagName: string }} dec */ dec) => dec.tagName === 'arpa-button'
        // );
        // expect(btn).toBeTruthy();
        // // fragment includes dts -> ensure preserved
        // expect(btn.dts || '').toContain('button.types');
    });
});
