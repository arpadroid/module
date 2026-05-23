/* eslint-disable no-use-before-define */
/**
 * Type-checker based helpers for extracting ConfigType properties from `.types.*` files.
 * Kept in a separate module so `cem-utils.js` can optionally call into it.
 */
/**
 * @typedef {import('../../../types.js').DescriptorType} DescriptorType
 * @typedef {typeof import('typescript')} Ts
 * @typedef {import('typescript').Program} TsProgram
 * @typedef {import('typescript').TypeChecker} TsTypeChecker
 * @typedef {import('typescript').SourceFile} TsSourceFile
 * @typedef {import('typescript').Node} TsNode
 * @typedef {import('typescript').PropertyName} TsPropertyName
 * @typedef {import('typescript').TypeElement} TsTypeElement
 * @typedef {import('typescript').TypeReferenceNode} TsTypeReferenceNode
 * @typedef {import('typescript').TypeAliasDeclaration} TsTypeAliasDeclaration
 * @typedef {import('typescript').InterfaceDeclaration} TsInterfaceDeclaration
 */
import { existsSync } from 'fs';

/**
 * @type {Map<string, { program: TsProgram, sourceText: string }>}
 */
const PROGRAM_CACHE = new Map();
const MAX_PROGRAM_CACHE = 16;

/**
 * Clears the TypeScript program cache. Call this between test runs to prevent cross-test state leakage.
 */
export function clearProgramCache() {
    PROGRAM_CACHE.clear();
}

/**
 * Returns the type node from a property-like member when available.
 * @param {Ts} ts
 * @param {TsNode} member
 * @returns {import('typescript').TypeNode | undefined}
 */
function getMemberTypeNode(ts, member) {
    if (!member) return undefined;
    if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member) || ts.isParameter(member)) {
        return member.type;
    }
    return undefined;
}

/**
 * Returns true when the expanded type needs parentheses before an array suffix is appended.
 * @param {string} text
 * @returns {boolean}
 */
function needsParenthesesForArray(text) {
    return /\|/.test(text) && !/^\(.*\)$/.test(text.trim());
}

/**
 * Formats an array type string, wrapping union elements when needed.
 * @param {string} elementText
 * @returns {string}
 */
function formatArrayTypeText(elementText) {
    const wrappedText = needsParenthesesForArray(elementText) ? `(${elementText})` : elementText;
    return `${wrappedText}[]`;
}

/**
 * Expands a union type node.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {import('typescript').UnionTypeNode} node
 * @param {TsSourceFile} sf
 * @param {Set<string>} seen
 * @returns {string | null}
 */
function expandUnionTypeText(ts, checker, node, sf, seen) {
    const parts = node.types
        .map(part => expandTypeNodeText(ts, checker, part, sf, seen) || part.getText(sf).trim())
        .filter(Boolean);
    return parts.length ? parts.join(' | ') : null;
}

/**
 * Expands an array-like type reference such as Array<T> or ReadonlyArray<T>.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsTypeReferenceNode} node
 * @param {TsSourceFile} sf
 * @param {Set<string>} seen
 * @returns {string | null}
 */
function expandArrayReferenceTypeText(ts, checker, node, sf, seen) {
    const elementText = expandTypeNodeText(ts, checker, node.typeArguments?.[0], sf, seen);
    return elementText ? formatArrayTypeText(elementText) : null;
}

/**
 * Expand a type node into a stable text representation, resolving simple aliases when possible.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsNode | undefined} node
 * @param {TsSourceFile} sf
 * @param {Set<string>} seen
 * @returns {string | null}
 */
function expandTypeNodeText(ts, checker, node, sf, seen = new Set()) {
    if (!node) return null;

    if (ts.isParenthesizedTypeNode(node)) {
        const inner = expandTypeNodeText(ts, checker, node.type, sf, seen);
        return inner ? `(${inner})` : null;
    }

    if (ts.isArrayTypeNode(node)) {
        const elementText = expandTypeNodeText(ts, checker, node.elementType, sf, seen);
        return elementText ? formatArrayTypeText(elementText) : null;
    }

    if (ts.isUnionTypeNode(node)) {
        return expandUnionTypeText(ts, checker, node, sf, seen);
    }

    if (ts.isLiteralTypeNode(node)) {
        return node.getText(sf).trim();
    }

    if (ts.isTypeReferenceNode(node)) {
        const typeNameText = node.typeName.getText(sf).trim();

        if (
            (typeNameText === 'Array' || typeNameText === 'ReadonlyArray') &&
            node.typeArguments?.length === 1
        ) {
            return expandArrayReferenceTypeText(ts, checker, node, sf, seen);
        }

        return expandReferencedAliasTypeText(ts, checker, node, sf, seen);
    }

    return null;
}

/**
 * Expands a referenced type alias when possible.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsTypeReferenceNode} node
 * @param {TsSourceFile} sf
 * @param {Set<string>} seen
 * @returns {string | null}
 */
function expandReferencedAliasTypeText(ts, checker, node, sf, seen) {
    const typeNameText = node.typeName.getText(sf).trim();
    if (seen.has(typeNameText)) return null;

    const symbol = checker.getSymbolAtLocation(node.typeName);
    const declarations = symbol?.declarations || [];
    for (const declaration of declarations) {
        if (!ts.isTypeAliasDeclaration(declaration)) continue;

        const nextSeen = new Set(seen);
        nextSeen.add(typeNameText);
        const expanded = expandTypeNodeText(ts, checker, declaration.type, sf, nextSeen);
        if (expanded) return expanded;
    }

    return null;
}

/**
 * Try to resolve the text representation of a member's type using the checker.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsSourceFile} sf
 * @param {TsNode} member
 * @returns {string}
 */
function getMemberTypeText(ts, checker, sf, member) {
    if (!member) return 'any';

    const typeNode = getMemberTypeNode(ts, member);
    if (typeNode) {
        const expandedTypeText = expandTypeNodeText(ts, checker, typeNode, sf);
        if (expandedTypeText) return expandedTypeText;
        const typ = checker.getTypeFromTypeNode(typeNode);
        return checker.typeToString(typ, member, ts.TypeFormatFlags.NoTruncation);
    }

    const typ = checker.getTypeAtLocation(member);
    return typ ? checker.typeToString(typ, member, ts.TypeFormatFlags.NoTruncation) : 'any';
}

/**
 * Return JSDoc comment for a member symbol (if any).
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsNode} member
 * @returns {string | undefined}
 */
function getMemberJsDoc(ts, checker, member) {
    if (!member) return undefined;

    let nameNode;
    if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member) || ts.isMethodSignature(member)) {
        nameNode = member.name;
    } else {
        return undefined;
    }

    const sym = checker.getSymbolAtLocation(nameNode);
    if (sym) return ts.displayPartsToString(sym.getDocumentationComment(checker)) || undefined;
    return undefined;
}

/**
 * Return a plain string for a `PropertyName` node, or `undefined` when it cannot be resolved.
 * @param {Ts} ts
 * @param {TsPropertyName} nameNode
 * @returns {string | undefined}
 */
function getPropertyNameText(ts, nameNode) {
    if (ts.isIdentifier(nameNode)) return String(nameNode.escapedText);
    if (ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) return String(nameNode.text);
    return undefined;
}

/**
 * Extract property descriptors from an AST `members` array using a TypeScript `TypeChecker`.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsSourceFile} sf
 * @param {readonly TsTypeElement[]} members
 * @returns {DescriptorType[]}
 */
function propsFromMembersWithChecker(ts, checker, sf, members) {
    const out = [];
    for (const member of members) {
        if (!member.name) continue;
        const propName = getPropertyNameText(ts, member.name);
        if (!propName) continue;
        const optional = !!member.questionToken;
        const typeText = getMemberTypeText(ts, checker, sf, member);
        const originalTypeText = getMemberTypeNode(ts, member)?.getText(sf).trim() || typeText;
        const jsDoc = getMemberJsDoc(ts, checker, member);
        out.push({ name: propName, originalTypeText, typeText, optional, jsDoc });
    }
    return out;
}

/**
 * Resolve a referenced type node (best-effort) and return its property descriptors.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsSourceFile} sf
 * @param {TsTypeReferenceNode} typeRefNode
 * @returns {DescriptorType[]}
 */
function gatherPropsFromTypeReference(ts, checker, sf, typeRefNode) {
    if (!typeRefNode || !ts.isTypeReferenceNode(typeRefNode)) return [];

    const resolvedType = checker.getTypeFromTypeNode(typeRefNode);
    if (!resolvedType) return [];

    const props = resolvedType.getProperties();
    const out = [];
    for (const propSym of props) {
        const name = String(propSym.getName());
        if (!name) continue;

        const docs = ts.displayPartsToString(propSym.getDocumentationComment(checker)) || undefined;
        const typ = checker.getTypeOfSymbolAtLocation(propSym, propSym.valueDeclaration || sf);
        const typeText = checker.typeToString(typ, undefined, ts.TypeFormatFlags.NoTruncation);
        out.push({ name, typeText, optional: false, jsDoc: docs });
    }
    return out;
}

/**
 * Given a declaration node (type alias or interface), return its properties using the checker.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsSourceFile} sf
 * @param {TsTypeAliasDeclaration} node
 * @returns {DescriptorType[]}
 */
function handleTypeAliasNode(ts, checker, sf, node) {
    const tn = node.type;
    if (ts.isTypeLiteralNode(tn)) return propsFromMembersWithChecker(ts, checker, sf, tn.members);
    if (ts.isIntersectionTypeNode(tn)) {
        const acc = [];
        for (const part of tn.types) {
            if (ts.isTypeLiteralNode(part))
                acc.push(...propsFromMembersWithChecker(ts, checker, sf, part.members));
            else if (ts.isTypeReferenceNode(part))
                acc.push(...gatherPropsFromTypeReference(ts, checker, sf, part));
        }
        return acc;
    }
    return [];
}

/**
 * Given a declaration node (type alias or interface), return its properties using the checker.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsSourceFile} sf
 * @param {TsTypeAliasDeclaration | TsInterfaceDeclaration} node
 * @returns {DescriptorType[]}
 */
function extractFromDeclarationWithChecker(ts, checker, sf, node) {
    if (ts.isTypeAliasDeclaration(node) && node.name) return handleTypeAliasNode(ts, checker, sf, node);
    if (ts.isInterfaceDeclaration(node) && node.name)
        return propsFromMembersWithChecker(ts, checker, sf, node.members);
    return [];
}

/**
 * Parse a `.types.d.ts` / `.types.ts` file using a TypeScript `Program` + `TypeChecker` and
 * return `DescriptorType[]` for the provided ConfigType name (best-effort).
 * @param {Ts} ts
 * @param {string} typesFilePath
 * @param {string} sourceText
 * @param {string | undefined | null} typeName
 * @returns {DescriptorType[]}
 */
export function parseConfigTypeWithChecker(ts, typesFilePath, sourceText, typeName) {
    if (!ts || !typesFilePath || !sourceText) return [];

    const compilerOptions = {
        allowJs: true,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        skipLibCheck: true
    };

    const cached = PROGRAM_CACHE.get(typesFilePath);
    let program = null;
    if (cached && cached.sourceText === sourceText) {
        PROGRAM_CACHE.delete(typesFilePath);
        PROGRAM_CACHE.set(typesFilePath, cached);
        program = cached.program;
    } else {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (!existsSync(typesFilePath)) {
            return [];
        }
        program = ts.createProgram([typesFilePath], compilerOptions);

        PROGRAM_CACHE.set(typesFilePath, { program, sourceText });
        if (PROGRAM_CACHE.size > MAX_PROGRAM_CACHE) {
            const oldestKey = PROGRAM_CACHE.keys().next().value;
            if (typeof oldestKey === 'string') PROGRAM_CACHE.delete(oldestKey);
        }
    }

    const checker = program.getTypeChecker();
    const sf =
        program.getSourceFile(typesFilePath) ||
        ts.createSourceFile(typesFilePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (!sf) return [];

    /**
     * Find a declaration by its exact name.
     * @param {string} nameToFind
     * @returns {DescriptorType[] | null}
     */
    function findByName(nameToFind) {
        for (const stmt of sf.statements) {
            if (!ts.isTypeAliasDeclaration(stmt) && !ts.isInterfaceDeclaration(stmt)) continue;
            const name = stmt.name ? String(stmt.name.escapedText || stmt.name.text) : undefined;
            if (name === nameToFind) return extractFromDeclarationWithChecker(ts, checker, sf, stmt);
        }
        return null;
    }

    if (typeName) {
        const res = findByName(typeName);
        return res || [];
    }

    /**
     * Find the first exported `*ConfigType` and return its descriptors.
     * @returns {DescriptorType[] | null}
     */
    function findFirstExportedConfig() {
        for (const stmt of sf.statements) {
            if ((ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) && stmt.name) {
                const name = String(stmt.name.escapedText || stmt.name.text);
                if (/ConfigType$/.test(name)) {
                    const res = extractFromDeclarationWithChecker(ts, checker, sf, stmt);
                    if (res && res.length) return res;
                }
            }
        }
        return null;
    }

    return findFirstExportedConfig() || [];
}
