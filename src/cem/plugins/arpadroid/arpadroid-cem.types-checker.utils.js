/**
 * Type-checker based helpers for extracting ConfigType properties from `.types.*` files.
 * Kept in a separate module so `arpadroid-cem.utils.js` can optionally call into it.
 */
/**
 * @typedef {import('./arpadroid-cem.utils.types.js').DescriptorType} DescriptorType
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
 * Try to resolve the text representation of a member's type using the checker.
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsSourceFile} sf
 * @param {TsNode} member
 * @returns {string}
 */
function getMemberTypeText(ts, checker, sf, member) {
    if (!member) return 'any';

    // narrow to property-like nodes that may have a `type` node
    if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member) || ts.isParameter(member)) {
        if (member.type) {
            const typ = checker.getTypeFromTypeNode(member.type);
            return checker.typeToString(typ, member, ts.TypeFormatFlags.NoTruncation);
        }
    }

    const typ = checker.getTypeAtLocation(member);
    return typ ? checker.typeToString(typ, member, ts.TypeFormatFlags.NoTruncation) : 'any';
}

/**
 * Return JSDoc comment for a member symbol (if any).
 * @param {Ts} ts
 * @param {TsTypeChecker} checker
 * @param {TsNode} member
 * @returns {string|undefined}
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
 * @returns {string|undefined}
 */
function getPropertyNameText(ts, nameNode) {
    if (ts.isIdentifier(nameNode)) return String(nameNode.escapedText);
    if (ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) return String(nameNode.text);
    // computed property / other forms — not supported for attribute names
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
        const jsDoc = getMemberJsDoc(ts, checker, member);
        out.push({ name: propName, typeText, optional, jsDoc });
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
 * @param {TsTypeAliasDeclaration|TsInterfaceDeclaration} node
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
 *
 * This is an optional, higher-fidelity replacement for the file-text-based parser.
 * @param {Ts} ts
 * @param {string} typesFilePath
 * @param {string} sourceText
 * @param {string|undefined|null} typeName
 * @returns {DescriptorType[]}
 */
export function parseConfigTypeWithChecker(ts, typesFilePath, sourceText, typeName) {
    if (!ts || !typesFilePath || !sourceText) return [];

    // conservative compiler options for a small program containing only the types file
    const compilerOptions = {
        allowJs: true,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        skipLibCheck: true
    };

    // Reuse existing program when possible to avoid expensive program creation
    const cached = PROGRAM_CACHE.get(typesFilePath);
    let program = null;
    if (cached && cached.sourceText === sourceText) {
        // move to most-recently-used
        PROGRAM_CACHE.delete(typesFilePath);
        PROGRAM_CACHE.set(typesFilePath, cached);
        program = cached.program;
    } else {
        // guard: ensure file exists before creating a Program
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (!existsSync(typesFilePath)) return [];
        program = ts.createProgram([typesFilePath], compilerOptions);

        // cache newly created program and evict oldest entry if needed
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

    // fast path: explicit name
    /**
     * Find a declaration by its exact name.
     * @param {string} nameToFind - Name to search for.
     * @returns {DescriptorType[]|null} - Descriptor array or null when not found.
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

    // fallback: find first exported symbol ending with 'ConfigType'
    /**
     * Find the first exported `*ConfigType` and return its descriptors.
     * @returns {DescriptorType[]|null} - Descriptors or null when none found.
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
