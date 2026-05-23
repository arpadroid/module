/**
 * @typedef {import('../../../types.js').TextType} TextType
 * @typedef {import('../../../types.js').DescriptorType} DescriptorType
 * @typedef {import('../../../types.js').AttributeDescriptorType} AttributeDescriptorType
 */

/**
 * Infer a simple type summary and serialization strategy from a TypeScript type string.
 * @param {string} typeText
 * @returns {TextType}
 */
export function inferType(typeText) {
    const text = String(typeText || '');
    const tl = text.toLowerCase();

    let summary = 'unknown';
    if (/\bstring\b/.test(tl)) summary = 'string';
    else if (/\bnumber\b/.test(tl)) summary = 'number';
    else if (/\bboolean\b/.test(tl)) summary = 'boolean';
    else if (/\barray\b/.test(tl) || /\[\]/.test(tl) || /\breadonly\b/.test(tl)) summary = 'array';
    else if (/\bobject\b/.test(tl) || tl.includes('{') || /\brecord\b/.test(tl)) summary = 'object';

    let serializedAs = 'property-only';
    if (/\[\]|Array<|Record<|\{/.test(text)) {
        serializedAs = 'json';
    } else if (/\bboolean\b/.test(text) && !/\bobject\b/.test(text)) {
        serializedAs = 'boolean-attr';
    } else if (/\bnumber\b/.test(text) && !/\bstring\b/.test(text)) {
        serializedAs = 'number';
    } else if (/\bstring\b/.test(text) || /\bnull\b|\bundefined\b/.test(text) || /\|/.test(text)) {
        serializedAs = 'string';
    }

    return { summary, serializedAs };
}

/**
 * Sanitize a string into a kebab-case attribute name.
 * @param {any} value
 * @returns {string}
 */
export function sanitizeAttributeName(value) {
    return String(value)
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .replace(/\s+/g, '-')
        .toLowerCase();
}

/**
 * Map parsed config properties into attribute descriptors suitable for the manifest.
 * @param {DescriptorType[]} props
 * @returns {AttributeDescriptorType[]}
 */
export function mapPropsToAttributes(props) {
    const byName = new Map();
    for (const prop of props || []) {
        const typeText = prop.typeText || 'any';
        const displayTypeText = prop.originalTypeText || typeText;
        const { summary, serializedAs } = inferType(typeText);
        const name = sanitizeAttributeName(prop.name);

        byName.set(name, {
            name,
            type: {
                text: displayTypeText,
                summary,
                ...(displayTypeText !== typeText ? { detail: typeText } : {})
            },
            serializedAs,
            description: prop.jsDoc,
            optional: !!prop.optional
        });
    }

    return [...byName.values()];
}
