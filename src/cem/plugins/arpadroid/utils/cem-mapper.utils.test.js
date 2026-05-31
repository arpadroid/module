import { inferType, mapPropsToAttributes } from './cem-mapper.utils.js';

describe('arpadroid CEM mapper utils', () => {
    test('keeps boolean as a boolean attribute', () => {
        expect(inferType('boolean').serializedAs).toBe('boolean-attr');
    });

    test('does not classify boolean|string unions as boolean attributes', () => {
        expect(inferType('boolean | string').serializedAs).toBe('string');
    });

    test('does not classify function unions containing boolean as boolean attributes', () => {
        const typeText = '((component: unknown) => boolean | string) | boolean | string';
        expect(inferType(typeText).serializedAs).toBe('string');
    });

    test('normalizes boolean unions in attribute type text for non-boolean serialization', () => {
        const props = [
            {
                name: 'canRender',
                typeText: '((component: unknown) => boolean | string) | boolean | string',
                originalTypeText: '((component: unknown) => boolean | string) | boolean | string',
                optional: true
            }
        ];

        const attrs = mapPropsToAttributes(props);
        expect(attrs[0]?.serializedAs).toBe('string');
        expect(attrs[0]?.type?.text).toBe('string');
        expect(attrs[0]?.type?.detail).toBe(
            '((component: unknown) => boolean | string) | boolean | string'
        );
    });
});
