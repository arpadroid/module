/**
 * @typedef {import('../../../types.js').DescriptorType} DescriptorType
 * @typedef {import('@custom-elements-manifest/analyzer').AnalyzePhaseParams} AnalyzePhaseParams
 * @typedef {import('../../../types.js').NodeType} NodeType
 */

/**
 * Parse a `defineCustomElement("tag-name", ClassOrIdentifier)` call AST node.
 * @param {AnalyzePhaseParams} payload
 * @returns {NodeType | null}
 */
export function parseCustomElement(payload) {
    const { ts, node } = payload;
    if (!ts?.isCallExpression(node)) return null;
    const callee = node.expression;
    if (!ts.isIdentifier(callee) || String(callee.escapedText) !== 'defineCustomElement') return null;

    const first = node.arguments?.[0];
    if (!first || !ts.isStringLiteral(first)) return null;
    const tagName = first.text;

    const second = node.arguments?.[1];
    let className;
    if (second) {
        if (ts.isIdentifier(second)) className = String(second.escapedText);
        else if (ts.isClassExpression(second) && second.name) className = String(second.name.escapedText);
    }

    return { tagName, className };
}

/**
 * Helper: extract property descriptors from a TypeScript 'members' array.
 * @param {string} sourceText
 * @param {readonly any[]} members
 * @returns {DescriptorType[]}
 */
export function propsFromMembers(sourceText, members) {
    const out = [];
    for (const member of members) {
        if (!member.name) continue;
        const propName = member.name.text || (member.name.escapedText && String(member.name.escapedText));
        if (!propName) continue;
        const optional = !!member.questionToken;
        const typeNode = /** @type {any} */ (member.type);
        const typeText = typeNode ? sourceText.slice(typeNode.pos, typeNode.end).trim() : 'any';
        const jsDoc = member.jsDoc && member.jsDoc.length ? String(member.jsDoc[0].comment || '') : undefined;
        out.push({ name: propName, originalTypeText: typeText, typeText, optional, jsDoc });
    }
    return out;
}

/**
 * Helper: given a declaration node (type alias or interface), return its props.
 * @param {any} ts
 * @param {string} sourceText
 * @param {any} node
 * @returns {DescriptorType[]}
 */
export function extractFromDeclaration(ts, sourceText, node) {
    if (ts.isTypeAliasDeclaration(node) && node.name) {
        const tn = node.type;
        if (ts.isTypeLiteralNode(tn)) return propsFromMembers(sourceText, tn.members);
        if (ts.isIntersectionTypeNode(tn)) {
            const acc = [];
            for (const part of tn.types) {
                if (ts.isTypeLiteralNode(part)) acc.push(...propsFromMembers(sourceText, part.members));
            }
            return acc;
        }
        return [];
    }
    if (ts.isInterfaceDeclaration(node) && node.name) {
        return propsFromMembers(sourceText, node.members);
    }
    return [];
}

/**
 * Find an exported TypeScript type ending with 'ConfigType' and return its properties.
 * @param {any} ts
 * @param {any} sf
 * @param {string} sourceText
 * @returns {DescriptorType[] | null}
 */
export function findConfigTypeName(ts, sf, sourceText) {
    for (const stmt of sf.statements) {
        if ((ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) && stmt.name) {
            const name = String(stmt.name.escapedText || stmt.name.text);
            if (/ConfigType$/.test(name)) {
                const res = extractFromDeclaration(ts, sourceText, stmt);
                if (res.length) return res;
            }
        }
    }
    return null;
}

/**
 * Parse a TypeScript `type` or `interface` for a ConfigType and return its properties.
 * @param {any} ts
 * @param {string} sourceText
 * @param {string | undefined | null} typeName
 * @returns {DescriptorType[]}
 */
export function parseConfigType(ts, sourceText, typeName) {
    if (!ts || !sourceText) return [];
    const sf = ts.createSourceFile('types.d.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    if (typeName) {
        for (const stmt of sf.statements) {
            const name = stmt && stmt.name ? String(stmt.name.escapedText || stmt.name.text) : undefined;
            if (name === typeName) {
                return extractFromDeclaration(ts, sourceText, stmt);
            }
        }
        return [];
    }

    return findConfigTypeName(ts, sf, sourceText) || [];
}
