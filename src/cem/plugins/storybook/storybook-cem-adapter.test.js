import {
    enhanceArgTypesFromCem,
    normalizeArrayArgs,
    normalizeCommaSeparatedArrayValue
} from './storybook-cem-adapter.js';

const globalStorybookManifest = /** @type {any} */ (globalThis);

/**
 * Builds a lightweight Storybook enhancer context for adapter unit tests.
 * @param {Record<string, any>} argTypes
 * @param {string | undefined} [component]
 * @returns {any}
 */
function createEnhancerContext(argTypes, component) {
    return {
        ...(component ? { component } : {}),
        argTypes
    };
}

describe('storybook cem adapter', () => {
    describe('enhanceArgTypesFromCem', () => {
        it('keeps the alias in the summary and moves the expanded type to detail', async () => {
            globalStorybookManifest.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__ = {
                modules: [
                    {
                        declarations: [
                            {
                                tagName: 'arpa-element',
                                attributes: [
                                    {
                                        name: 'template-types',
                                        type: {
                                            text: 'TemplateContentMode[]',
                                            detail: "('add' | 'content' | 'prepend' | 'append' | 'list-item' | 'view')[]"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const argTypes = {
                'template-types': {
                    type: {
                        name: 'TemplateContentMode[]'
                    },
                    table: {
                        type: {
                            summary: 'TemplateContentMode[]'
                        }
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes, 'arpa-element'));

            expect(enhanced.templateTypes.type.name).toBe('enum');
            expect(enhanced.templateTypes.type.value).toEqual([
                'add',
                'content',
                'prepend',
                'append',
                'list-item',
                'view'
            ]);
            expect(enhanced.templateTypes.__arpadroidArrayControl).toBe('options');
            expect(enhanced.templateTypes.control).toEqual({ type: 'check' });
            expect(enhanced.templateTypes.options).toEqual([
                'add',
                'content',
                'prepend',
                'append',
                'list-item',
                'view'
            ]);
            expect(enhanced.templateTypes.table.type.summary).toBe('TemplateContentMode[]');
            expect(enhanced.templateTypes.table.type.detail).toBe(
                "('add' | 'content' | 'prepend' | 'append' | 'list-item' | 'view')[]"
            );
        });

        it('removes synthetic type-only descriptions while keeping the type summary intact', () => {
            const argTypes = {
                variant: {
                    description: "TS type: 'primary' | 'secondary'",
                    type: {
                        name: "'primary' | 'secondary'"
                    },
                    table: {
                        type: {
                            summary: "'primary' | 'secondary'"
                        }
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.variant.description).toBeUndefined();
            expect(enhanced.variant.table.type.summary).toBe("'primary' | 'secondary'");
        });

        it('keeps authored descriptions unchanged', () => {
            const argTypes = {
                classNames: {
                    description: 'Applied to the root element.',
                    type: {
                        name: 'string[]'
                    },
                    table: {
                        type: {
                            summary: 'string[]'
                        }
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.classNames.description).toBe(
                'Applied to the root element. Enter a comma-separated list of strings.'
            );
        });

        it('promotes finite string arrays into checkbox controls', () => {
            const argTypes = {
                variant: {
                    type: {
                        name: "('primary' | 'secondary' | 'tertiary')[]"
                    },
                    table: {
                        type: {
                            summary: "('primary' | 'secondary' | 'tertiary')[]"
                        }
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.variant.control).toEqual({ type: 'check' });
            expect(enhanced.variant.options).toEqual(['primary', 'secondary', 'tertiary']);
            expect(enhanced.variant.type).toEqual({
                name: 'enum',
                value: ['primary', 'secondary', 'tertiary']
            });
            expect(enhanced.variant.__arpadroidArrayControl).toBe('options');
        });

        it('uses text controls for open-ended arrays', () => {
            const argTypes = {
                classNames: {
                    type: {
                        name: 'string[]'
                    },
                    table: {
                        type: {
                            summary: 'string[]'
                        }
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.classNames.control).toEqual({ type: 'text' });
            expect(enhanced.classNames.__arpadroidArrayControl).toBe('text');
            expect(enhanced.classNames.description).toBe('Enter a comma-separated list of strings.');
            expect(enhanced.classNames.table.type.summary).toBe('string[]');
        });

        it('appends the array hint to existing descriptions', () => {
            const argTypes = {
                classNames: {
                    type: {
                        name: 'string[]'
                    },
                    description: 'Applied to the root element.'
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.classNames.description).toBe(
                'Applied to the root element. Enter a comma-separated list of strings.'
            );
        });

        it('uses type-specific hints for numeric arrays', () => {
            const argTypes = {
                values: {
                    type: {
                        name: 'number[]'
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.values.description).toBe('Enter a comma-separated list of numbers.');
        });

        it('falls back to the generic hint for non-scalar arrays', () => {
            const argTypes = {
                items: {
                    type: {
                        name: 'Array<Record<string, unknown>>'
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.items.description).toBe('Enter a comma-separated list.');
        });

        it('does not override explicit non-object controls', () => {
            const argTypes = {
                tags: {
                    type: {
                        name: 'string[]'
                    },
                    control: {
                        type: 'radio'
                    }
                }
            };

            const enhanced = enhanceArgTypesFromCem(createEnhancerContext(argTypes));

            expect(enhanced.tags).toEqual(argTypes.tags);
        });
    });

    describe('normalizeCommaSeparatedArrayValue', () => {
        it('splits text input into a trimmed string array', () => {
            expect(normalizeCommaSeparatedArrayValue(' alpha, beta ,, gamma ')).toEqual([
                'alpha',
                'beta',
                'gamma'
            ]);
        });

        it('preserves non-string and array values', () => {
            expect(normalizeCommaSeparatedArrayValue(['alpha'])).toEqual(['alpha']);
            expect(normalizeCommaSeparatedArrayValue(undefined)).toBeUndefined();
            expect(normalizeCommaSeparatedArrayValue(null)).toBeNull();
            expect(normalizeCommaSeparatedArrayValue(12)).toBe(12);
        });

        it('turns blank strings into empty arrays', () => {
            expect(normalizeCommaSeparatedArrayValue('   ')).toEqual([]);
        });
    });

    describe('normalizeArrayArgs', () => {
        it('normalizes only args marked as text-backed arrays', () => {
            const args = {
                classNames: 'alpha, beta',
                label: 'Button',
                variants: ['primary']
            };
            const argTypes = {
                classNames: { __arpadroidArrayControl: 'text' },
                label: { control: { type: 'text' } },
                variants: { __arpadroidArrayControl: 'options' }
            };

            const normalized = normalizeArrayArgs(args, argTypes);

            expect(normalized).toEqual({
                classNames: ['alpha', 'beta'],
                label: 'Button',
                variants: ['primary']
            });
        });
    });

    afterEach(() => {
        delete globalStorybookManifest.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__;
    });
});
