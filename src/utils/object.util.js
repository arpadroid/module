/**
 * Checks if an object is an object and not an array or HTMLElement.
 * @param {unknown} obj
 * @returns {boolean}
 */
export function isObject(obj) {
    return obj?.constructor?.name === 'Object';
}

/**
 * Merges two objects recursively.
 * @param {Record<string, any>} obj
 * @param {Record<string, any>} obj2
 * @param {boolean} strict - Strict mode will filter out properties that are not in the original object.
 * @returns {Record<string, any>}
 */
export function mergeObjects(obj = {}, obj2 = {}, strict = false) {
    if (Object.keys(obj2).length === 0) {
        return obj;
    }
    const rv = { ...obj };
    for (const [key, value] of Object.entries(obj2)) {
        const hasKeyInRv = key in rv;
        if (strict && !hasKeyInRv) {
            continue;
        }
        if (isObject(value) && isObject(rv[key])) {
            rv[key] = mergeObjects(rv[key], value, strict);
        } else {
            rv[key] = value;
        }
    }
    return rv;
}
