/**
 * @jest-environment jsdom
 */
/* eslint-disable id-length */

import {
    getStoryContext,
    setStoryContext,
    editStoryContext,
    getStoryContextValue,
    setStoryContextValue
} from './storybookTool.js';

describe('storybookTool', () => {
    beforeEach(() => {
        if (window.parent._storyContext) {
            window.parent._storyContext = {};
        }
    });

    describe('getStoryContext', () => {
        it('should handle context creation and retrieval', () => {
            expect(getStoryContext()).toBeUndefined();
            expect(getStoryContext('')).toBeUndefined();

            const ctx1 = getStoryContext('story-1');
            expect(ctx1).toEqual({});

            ctx1 && (ctx1.testData = 'value');
            expect(getStoryContext('story-1')).toBe(ctx1);
            expect(getStoryContext('story-1')?.testData).toBe('value');

            // Separate contexts for different stories
            const ctx2 = getStoryContext('story-2');
            if (ctx2) ctx2.data = 'second';
            expect(getStoryContext('story-1')?.testData).toBe('value');
            expect(getStoryContext('story-2')?.data).toBe('second');
        });
    });

    describe('setStoryContext', () => {
        it('should set and replace context completely', () => {
            const payload = { key: 'value', nested: { prop: 123 } };
            expect(setStoryContext('story-1', payload)).toEqual(payload);
            expect(getStoryContext('story-1')).toEqual(payload);

            setStoryContext('story-1', { new: 'data' });
            expect(getStoryContext('story-1')).toEqual({ new: 'data' });
            expect(getStoryContext('story-1')?.key).toBeUndefined();

            // Handle empty and complex objects
            setStoryContext('story-2', {});
            expect(getStoryContext('story-2')).toEqual({});

            const complex = { level1: { level2: { level3: { value: 'deep' } } } };
            setStoryContext('story-3', complex);
            expect(getStoryContext('story-3')).toEqual(complex);
        });
    });

    describe('editStoryContext', () => {
        it('should merge and deeply merge contexts', () => {
            setStoryContext('story-1', { a: 1, b: 2 });
            expect(editStoryContext('story-1', { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });

            editStoryContext('story-1', { b: 99 });
            expect(getStoryContext('story-1')).toEqual({ a: 1, b: 99, c: 3 });

            // Deep merge
            setStoryContext('story-2', { nested: { x: 1, y: 2 } });
            editStoryContext('story-2', { nested: { y: 3, z: 4 } });
            expect(getStoryContext('story-2')).toEqual({ nested: { x: 1, y: 3, z: 4 } });
        });

        it('should handle edge cases and immutability', () => {
            expect(editStoryContext('new-story', { data: 'value' })).toEqual({ data: 'value' });

            setStoryContext('story-1', { a: 1 });
            expect(editStoryContext('story-1', {})).toEqual({ a: 1 });

            const original = { a: 1 };
            setStoryContext('story-2', original);
            editStoryContext('story-2', { b: 2 });
            expect(original).toEqual({ a: 1 });
            expect(getStoryContext('story-2')).toEqual({ a: 1, b: 2 });
        });
    });

    describe('getStoryContextValue', () => {
        it('should get values with proper type handling', () => {
            setStoryContext('story-1', {
                key: 'value',
                number: 42,
                nested: { deep: { value: 'test' } },
                nullValue: null,
                undefinedValue: undefined,
                arr: [1, 2, 3]
            });

            expect(getStoryContextValue('story-1', 'key')).toBe('value');
            expect(getStoryContextValue('story-1', 'number')).toBe(42);
            expect(getStoryContextValue('story-1', 'nested')).toEqual({ deep: { value: 'test' } });
            expect(getStoryContextValue('story-1', 'nullValue')).toBeNull();
            expect(getStoryContextValue('story-1', 'undefinedValue')).toBeUndefined();
            expect(getStoryContextValue('story-1', 'arr')).toEqual([1, 2, 3]);
            expect(getStoryContextValue('story-1', 'nonexistent')).toBeUndefined();
            expect(getStoryContextValue('non-existent', 'key')).toBeUndefined();
        });
    });

    describe('setStoryContextValue', () => {
        it('should set individual values and preserve context', () => {
            setStoryContext('story-1', { a: 1 });
            expect(setStoryContextValue('story-1', 'b', 2)).toEqual({ a: 1, b: 2 });

            setStoryContextValue('story-1', 'a', 99);
            expect(getStoryContextValue('story-1', 'a')).toBe(99);
            expect(getStoryContext('story-1')).toEqual({ a: 99, b: 2 });
        });

        it('should handle creation and complex values', () => {
            expect(setStoryContextValue('new', 'key', 'value')).toEqual({ key: 'value' });

            const complex = { nested: { data: [1, 2, 3] } };
            setStoryContextValue('story-1', 'complex', complex);
            expect(getStoryContextValue('story-1', 'complex')).toEqual(complex);

            setStoryContextValue('story-2', 'nullKey', null);
            setStoryContextValue('story-2', 'undefinedKey', undefined);
            expect(getStoryContextValue('story-2', 'nullKey')).toBeNull();
            expect(getStoryContextValue('story-2', 'undefinedKey')).toBeUndefined();
        });
    });

    describe('context isolation', () => {
        it('should maintain complete isolation between stories', () => {
            setStoryContext('story-1', { type: 'first', shared: 'value1' });
            setStoryContext('story-2', { type: 'second', shared: 'value2' });
            setStoryContext('story-3', { type: 'third' });

            expect(getStoryContextValue('story-1', 'type')).toBe('first');
            expect(getStoryContextValue('story-2', 'type')).toBe('second');
            expect(getStoryContextValue('story-3', 'type')).toBe('third');

            editStoryContext('story-1', { shared: 'modified' });
            expect(getStoryContextValue('story-1', 'shared')).toBe('modified');
            expect(getStoryContextValue('story-2', 'shared')).toBe('value2');
        });
    });
});
