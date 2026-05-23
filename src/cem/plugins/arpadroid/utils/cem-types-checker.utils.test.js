import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

import { parseConfigTypeWithChecker, clearProgramCache } from './cem-types-checker.utils.js';

describe('arpadroid CEM types checker utils', () => {
    afterEach(() => {
        clearProgramCache();
    });

    test('expands aliased literal unions for array properties', () => {
        const typesFilePath = resolve(
            dirname(fileURLToPath(import.meta.url)),
            '../../../../../../ui/src/components/arpaElement/arpaElement.types.d.ts'
        );
        const sourceText = readFileSync(typesFilePath, 'utf8');

        const props = parseConfigTypeWithChecker(ts, typesFilePath, sourceText, 'ArpaElementConfigType');
        const templateTypes = props.find(prop => prop.name === 'templateTypes');

        expect(templateTypes?.typeText).toBe(
            "('add' | 'content' | 'prepend' | 'append' | 'list-item' | 'view')[]"
        );
    });
});
