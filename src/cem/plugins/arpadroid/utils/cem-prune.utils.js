/**
 * @typedef {import('./cem-utils.types.js').ManifestFilterPolicy} ManifestFilterPolicy
 */

/**
 * Determine whether a declaration represents a custom-element class in the manifest.
 * @param {any} decl
 * @returns {boolean}
 */
export function isCustomElementClass(decl) {
    return Boolean(decl && decl.kind === 'class' && (decl.customElement || decl.tagName));
}

/**
 * Determine whether a declaration is eligible for inherited attribute propagation.
 * @param {any} decl
 * @returns {boolean}
 */
export function isPropagationCandidate(decl) {
    return isCustomElementClass(decl) && Boolean(decl.superclass?.name);
}

/**
 * Determine whether a manifest member is private and should be omitted from published API metadata.
 * @param {any} member
 * @returns {boolean}
 */
function isPrivateMember(member) {
    if (!member) return false;
    if (member.privacy === 'private') return true;
    return typeof member.name === 'string' && member.name.startsWith('#');
}

/**
 * Determine whether a manifest method is intentionally internal by underscore naming.
 * @param {any} member
 * @returns {boolean}
 */
function isUnderscoreMethod(member) {
    if (!member || member.kind !== 'method') return false;
    return typeof member.name === 'string' && member.name.startsWith('_');
}

/**
 * Determine whether a manifest property-like member is intentionally internal by underscore naming.
 * @param {any} member
 * @returns {boolean}
 */
function isUnderscoreProperty(member) {
    if (!member) return false;
    const kind = member.kind;
    if (kind !== 'field' && kind !== 'property') return false;
    return typeof member.name === 'string' && member.name.startsWith('_');
}

/**
 * Determine whether a member is inherited from an ancestor declaration.
 * @param {any} member
 * @returns {boolean}
 */
function isInheritedMember(member) {
    return Boolean(member?.inheritedFrom);
}

/**
 * Determine whether a member should remain in published manifest output.
 * @param {any} member
 * @param {Record<string, any>} policy
 * @returns {boolean}
 */
function shouldKeepMember(member, policy) {
    return !(
        (policy.omitInheritedMembers && isInheritedMember(member)) ||
        (policy.omitPrivateMembers && isPrivateMember(member)) ||
        (policy.omitUnderscoreMethods && isUnderscoreMethod(member)) ||
        (policy.omitUnderscoreProperties && isUnderscoreProperty(member))
    );
}

/**
 * Build a full member-filter policy with defaults.
 * @param {ManifestFilterPolicy} [policy]
 * @returns {ManifestFilterPolicy}
 */
function resolveMemberFilterPolicy(policy = {}) {
    const inputPolicy = /** @type {ManifestFilterPolicy} */ (policy || {});
    return {
        omitInheritedMembers: inputPolicy.omitInheritedMembers === true,
        omitPrivateMembers: inputPolicy.omitPrivateMembers === true,
        omitUnderscoreMethods: inputPolicy.omitUnderscoreMethods === true,
        omitUnderscoreProperties: inputPolicy.omitUnderscoreProperties === true
    };
}

/**
 * Build a full structural-filter policy with defaults.
 * @param {ManifestFilterPolicy} [policy]
 * @returns {ManifestFilterPolicy}
 */
function resolveStructuralFilterPolicy(policy = {}) {
    const inputPolicy = /** @type {ManifestFilterPolicy} */ (policy || {});
    return {
        omitModuleKind: inputPolicy.omitModuleKind === true,
        omitDeclarationCustomElement: inputPolicy.omitDeclarationCustomElement === true,
        omitSuperclassModule: inputPolicy.omitSuperclassModule === true,
        omitInheritedFromModule: inputPolicy.omitInheritedFromModule === true,
        omitExportDeclarationModule: inputPolicy.omitExportDeclarationModule === true,
        omitDescriptions: inputPolicy.omitDescriptions === true,
        omitMemberParameters: inputPolicy.omitMemberParameters === true,
        omitTypeSummary: inputPolicy.omitTypeSummary === true,
        omitTypeDetail: inputPolicy.omitTypeDetail === true,
        omitOptional: inputPolicy.omitOptional === true,
        omitExports: inputPolicy.omitExports === true,
        omitExportDeclaration: inputPolicy.omitExportDeclaration === true
    };
}

/** @type {ManifestFilterPolicy} */
let activeMemberFilterPolicy = resolveMemberFilterPolicy();

/** @type {ManifestFilterPolicy} */
let activeStructuralFilterPolicy = resolveStructuralFilterPolicy();

/**
 * Configure active member filtering policy.
 * @param {ManifestFilterPolicy} [policy]
 */
export function setMemberFilterPolicy(policy = {}) {
    activeMemberFilterPolicy = resolveMemberFilterPolicy(policy);
}

/**
 * Configure active structural metadata filtering policy.
 * @param {ManifestFilterPolicy} [policy]
 */
export function setStructuralFilterPolicy(policy = {}) {
    activeStructuralFilterPolicy = resolveStructuralFilterPolicy(policy);
}

/**
 * Apply member filtering rules to a declaration.
 * @param {any} decl
 * @param {Record<string, any>} policy
 * @returns {any}
 */
function filterDeclarationMembers(decl, policy) {
    if (!Array.isArray(decl.members) || !decl.members.length) return decl;

    /** @type {any[]} */
    const filteredMembers = [];
    for (const member of decl.members) {
        if (shouldKeepMember(member, policy)) filteredMembers.push(member);
    }

    return {
        ...decl,
        members: filteredMembers
    };
}

/**
 * Apply member filtering rules to a module.
 * @param {any} mod
 * @param {Record<string, any>} policy
 * @returns {any}
 */
function filterModuleMembers(mod, policy) {
    /** @type {any[]} */
    const filteredDeclarations = [];
    for (const decl of mod.declarations || []) {
        filteredDeclarations.push(filterDeclarationMembers(decl, policy));
    }

    return {
        ...mod,
        declarations: filteredDeclarations
    };
}

/**
 * Remove filtered members from declarations while preserving other manifest metadata.
 * @param {any[]} modules
 * @returns {any[]}
 */
export function filterClassMembers(modules) {
    return (modules || []).map((mod) => filterModuleMembers(mod, activeMemberFilterPolicy));
}

/**
 * Remove selected structural metadata fields while preserving semantic API details.
 * @param {any[]} modules
 * @returns {any[]}
 */
export function filterManifestStructuralMetadata(modules) {
    const policy = activeStructuralFilterPolicy;

    /**
     * Decide whether a key should be removed globally.
     * @param {string} key
     * @returns {boolean}
     */
    function shouldRemoveKey(key) {
        if (policy.omitDescriptions && key === 'description') return true;
        if (policy.omitOptional && key === 'optional') return true;
        return false;
    }

    /**
     * Optionally strip parameter payload from member entries.
     * @param {any} members
     * @returns {any}
     */
    function maybeStripMemberParameters(members) {
        if (!policy.omitMemberParameters || !Array.isArray(members)) return members;
        return members.map((member) => {
            if (!member || typeof member !== 'object') return member;
            const nextMember = { ...member };
            delete nextMember.parameters;
            return nextMember;
        });
    }

    /**
     * Optionally strip summary/detail metadata from a type object.
     * @param {any} typeMetadata
     * @returns {any}
     */
    function maybeStripTypeMetadata(typeMetadata) {
        if (!(policy.omitTypeSummary || policy.omitTypeDetail)) return typeMetadata;
        if (!typeMetadata || typeof typeMetadata !== 'object') return typeMetadata;

        const nextType = { ...typeMetadata };
        if (policy.omitTypeSummary) delete nextType.summary;
        if (policy.omitTypeDetail) delete nextType.detail;
        return nextType;
    }

    /**
     * Apply key-specific transformations before recursive descent.
     * @param {string} key
     * @param {any} child
     * @returns {any}
     */
    function transformChildByKey(key, child) {
        if (key === 'members') return maybeStripMemberParameters(child);
        if (key === 'type') return maybeStripTypeMetadata(child);
        return child;
    }

    /**
     * Recursively remove optional content fields according to policy toggles.
     * @param {any} value
     * @returns {any}
     */
    function applyOptionalContentFilters(value) {
        if (Array.isArray(value)) {
            return value.map(applyOptionalContentFilters);
        }
        if (!value || typeof value !== 'object') {
            return value;
        }

        /** @type {Record<string, any>} */
        const result = {};
        for (const [key, rawChild] of Object.entries(value)) {
            if (shouldRemoveKey(key)) continue;
            const transformed = transformChildByKey(key, rawChild);
            result[key] = applyOptionalContentFilters(transformed);
        }

        return result;
    }

    /**
     * Strip module metadata from inheritedFrom references on attributes.
     * @param {any} attribute
     * @returns {any}
     */
    function stripInheritedFromModule(attribute) {
        if (!attribute?.inheritedFrom || typeof attribute.inheritedFrom !== 'object') {
            return attribute;
        }
        if (!Object.hasOwn(attribute.inheritedFrom, 'module')) return attribute;

        const inheritedFrom = { ...attribute.inheritedFrom };
        delete inheritedFrom.module;
        return {
            ...attribute,
            inheritedFrom
        };
    }

    /**
     * Remove selected declaration-level structural metadata.
     * @param {any} decl
     * @returns {any}
     */
    function compactDeclarationStructure(decl) {
        let nextDecl = decl;

        if (policy.omitDeclarationCustomElement && Object.hasOwn(nextDecl, 'customElement')) {
            const withoutCustomElement = { ...nextDecl };
            delete withoutCustomElement.customElement;
            nextDecl = withoutCustomElement;
        }

        if (policy.omitSuperclassModule && nextDecl.superclass?.module) {
            const superclass = { ...nextDecl.superclass };
            delete superclass.module;
            nextDecl = {
                ...nextDecl,
                superclass
            };
        }

        if (policy.omitInheritedFromModule && Array.isArray(nextDecl.attributes)) {
            nextDecl = {
                ...nextDecl,
                attributes: nextDecl.attributes.map(stripInheritedFromModule)
            };
        }

        return nextDecl;
    }

    /**
     * Remove module reference from export declaration metadata.
     * @param {any} exportEntry
     * @returns {any}
     */
    function compactExportStructure(exportEntry) {
        if (policy.omitExportDeclaration) {
            const withoutDeclaration = { ...exportEntry };
            delete withoutDeclaration.declaration;
            return withoutDeclaration;
        }
        if (!policy.omitExportDeclarationModule) return exportEntry;
        if (!exportEntry?.declaration || typeof exportEntry.declaration !== 'object') return exportEntry;
        if (!Object.hasOwn(exportEntry.declaration, 'module')) return exportEntry;

        const declaration = { ...exportEntry.declaration };
        delete declaration.module;
        return {
            ...exportEntry,
            declaration
        };
    }

    return (modules || []).map((mod) => {
        const declarations = (mod.declarations || []).map(compactDeclarationStructure);
        const exports = policy.omitExports ? [] : (mod.exports || []).map(compactExportStructure);

        let nextModule = {
            ...mod,
            declarations,
            exports
        };

        if (policy.omitModuleKind && Object.hasOwn(nextModule, 'kind')) {
            const restModule = { ...nextModule };
            delete restModule.kind;
            nextModule = restModule;
        }

        return applyOptionalContentFilters(nextModule);
    });
}

/**
 * Normalize type metadata to a compact representation.
 * @param {any} type
 * @returns {any}
 */
function compactType(type) {
    if (!type) return type;
    if (typeof type === 'string') return type;
    if (type.text) return type.text;
    return type;
}

/**
 * Keep only compact attribute metadata while preserving control-relevant fields.
 * @param {any} attribute
 * @returns {any}
 */
function compactAttribute(attribute) {
    if (!attribute || !attribute.name) return attribute;
    /** @type {Record<string, any>} */
    const compact = { name: attribute.name };
    if (attribute.type) compact.type = compactType(attribute.type);
    if (attribute.serializedAs) compact.serializedAs = attribute.serializedAs;
    if (attribute.optional === true) compact.optional = true;

    // Preserve inherited category grouping while removing repetitive module path payload.
    const inheritedFrom =
        typeof attribute.inheritedFrom === 'string' ? attribute.inheritedFrom : attribute.inheritedFrom?.name;
    if (inheritedFrom) {
        compact.inheritedFrom = inheritedFrom;
    }

    return compact;
}

/**
 * Keep only compact superclass metadata needed for inheritance tracing.
 * @param {any} superclass
 * @returns {any}
 */
function compactSuperclass(superclass) {
    if (!superclass || !superclass.name) return undefined;
    /** @type {Record<string, any>} */
    const compact = { name: superclass.name };
    if (!activeStructuralFilterPolicy.omitSuperclassModule && superclass.module) {
        compact.module = superclass.module;
    }
    return compact;
}

/**
 * Keep declaration details relevant for Storybook controls.
 * @param {any} decl
 * @returns {any}
 */
function trimDeclarationForManifest(decl) {
    const attributes = /** @type {any[]} */ (
        (decl.attributes || []).map((/** @type {any} */ attr) => compactAttribute(attr))
    );

    /** @type {Record<string, any>} */
    const compact = {
        kind: decl.kind,
        name: decl.name,
        attributes
    };

    if (decl.tagName) compact.tagName = decl.tagName;
    const superclass = compactSuperclass(decl.superclass);
    if (superclass) compact.superclass = superclass;

    return compact;
}

/**
 * Keep only compact module metadata plus pruned declarations.
 * @param {any} mod
 * @param {any[]} declarations
 * @returns {any}
 */
function compactModule(mod, declarations) {
    /** @type {Record<string, any>} */
    const compact = {
        path: mod.path,
        declarations
    };
    return compact;
}

/**
 * Keep only custom-element declarations that resolve to custom-element modules.
 * @param {any[]} modules
 * @returns {any[]}
 */
export function pruneManifestModules(modules) {
    const prunedModules = [];
    for (const mod of modules) {
        const declarations = /** @type {any[]} */ (
            (mod.declarations || []).filter(isCustomElementClass).map(trimDeclarationForManifest)
        );

        if (declarations.length) {
            prunedModules.push(compactModule(mod, declarations));
        }
    }

    return prunedModules;
}
