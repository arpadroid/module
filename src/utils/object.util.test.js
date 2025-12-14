/**
 * @jest-environment node
 */

import { isObject, mergeObjects } from './object.util.js';

describe('object.util', () => {
    describe('isObject', () => {
        it('should correctly identify plain objects vs other types', () => {
            // True for plain objects
            expect(isObject({})).toBe(true);
            expect(isObject({ key: 'value' })).toBe(true);
            expect(isObject({ nested: { object: true } })).toBe(true);
            
            // False for everything else
            expect(isObject([])).toBe(false);
            expect(isObject(null)).toBe(false);
            expect(isObject(undefined)).toBe(false);
            expect(isObject('string')).toBe(false);
            expect(isObject(123)).toBe(false);
            expect(isObject(true)).toBe(false);
            expect(isObject(() => {})).toBe(false);
            expect(isObject(new Date())).toBe(false);
            expect(isObject(/regex/)).toBe(false);
        });
    });

    describe('mergeObjects', () => {
        it('should merge and override properties correctly', () => {
            expect(mergeObjects({ a: 1, b: 2 }, { c: 3, d: 4 }))
                .toEqual({ a: 1, b: 2, c: 3, d: 4 });
            
            expect(mergeObjects({ a: 1, b: 2 }, { b: 3, c: 4 }))
                .toEqual({ a: 1, b: 3, c: 4 });
            
            expect(mergeObjects({ a: 1 }, {})).toEqual({ a: 1 });
            expect(mergeObjects({}, { a: 1 })).toEqual({ a: 1 });
        });

        it('should deeply merge nested objects', () => {
            expect(mergeObjects(
                { a: 1, nested: { x: 1, y: 2 } },
                { b: 2, nested: { y: 3, z: 4 } }
            )).toEqual({ a: 1, b: 2, nested: { x: 1, y: 3, z: 4 } });
            
            expect(mergeObjects(
                { level1: { level2: { level3: { a: 1 } } } },
                { level1: { level2: { level3: { b: 2 } } } }
            )).toEqual({ level1: { level2: { level3: { a: 1, b: 2 } } } });
        });

        it('should not mutate original objects', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { b: 3, c: 4 };
            const result = mergeObjects(obj1, obj2);

            expect(obj1).toEqual({ a: 1, b: 2 });
            expect(obj2).toEqual({ b: 3, c: 4 });
            expect(result).not.toBe(obj1);
            expect(result).not.toBe(obj2);
        });

        it('should handle type replacements', () => {
            expect(mergeObjects({ nested: 'string' }, { nested: { x: 1 } }))
                .toEqual({ nested: { x: 1 } });
            
            expect(mergeObjects({ nested: { x: 1 } }, { nested: 'string' }))
                .toEqual({ nested: 'string' });
            
            expect(mergeObjects({ arr: [1, 2, 3] }, { arr: [4, 5] }))
                .toEqual({ arr: [4, 5] });
        });

        it('should handle null and undefined values', () => {
            expect(mergeObjects(
                { a: 1, b: null, c: undefined },
                { b: 2, c: 3, d: null }
            )).toEqual({ a: 1, b: 2, c: 3, d: null });
        });

        describe('strict mode', () => {
            it('should only merge existing properties when strict=true', () => {
                expect(mergeObjects({ a: 1, b: 2 }, { b: 3, c: 4 }, true))
                    .toEqual({ a: 1, b: 3 });
                
                expect(mergeObjects(
                    { a: 1, nested: { x: 1, y: 2 } },
                    { b: 2, nested: { y: 3, z: 4 } },
                    true
                )).toEqual({ a: 1, nested: { x: 1, y: 3 } });
                
                expect(mergeObjects(
                    { existing: { nested: { a: 1 } } },
                    { existing: { nested: { a: 2, b: 3 }, newProp: 'value' }, newKey: 'value' },
                    true
                )).toEqual({ existing: { nested: { a: 2 } } });
            });
        });
    });
});
