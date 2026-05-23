/**
 * @typedef {import('../../../types.js').NodeType} NodeType
 */

export { inferType, sanitizeAttributeName, mapPropsToAttributes } from './cem-mapper.utils.js';

export { handleAttributes, mergeInheritedAttributes, upsertDeclaration } from './cem-mutation.utils.js';

export {
    attributesFromModule,
    extractAttributesFromTypesFile,
    getConfigTypeName
} from './cem-source.utils.js';

export {
    extractFromDeclaration,
    findConfigTypeName,
    parseConfigType,
    propsFromMembers
} from './cem-parser.utils.js';
