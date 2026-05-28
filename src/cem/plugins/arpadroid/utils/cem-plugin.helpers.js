/**
 * Normalize a module path for stable matching.
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeModulePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Convert an absolute source path to the analyzer's manifest-style `src/...` module path.
 * @param {string | undefined} filePath
 * @returns {string}
 */
export function toManifestModulePath(filePath) {
    const normalized = normalizeModulePath(filePath);
    const srcSegment = '/src/';
    const index = normalized.lastIndexOf(srcSegment);
    if (index >= 0) return normalized.slice(index + 1);
    return normalized;
}

/**
 * Build a declaration lookup map keyed by class name.
 * @param {any[]} modules
 * @returns {Map<string, any>}
 */
export function buildDeclMapFromModules(modules) {
    /** @type {Map<string, any>} */
    const declarationMap = new Map();
    for (const mod of modules || []) {
        for (const decl of /** @type {any[]} */ (mod.declarations || [])) {
            if (decl.name) declarationMap.set(decl.name, decl);
        }
    }
    return declarationMap;
}

/**
 * Keep only modules that were observed with a `defineCustomElement(...)` registration during analysis.
 * @param {any[]} modules
 * @param {Set<string>} registeredModulePaths
 * @returns {any[]}
 */
export function filterModulesWithRegistrations(modules, registeredModulePaths) {
    if (!registeredModulePaths.size) return modules || [];
    return (modules || []).filter((mod) => registeredModulePaths.has(normalizeModulePath(mod.path)));
}

/**
 * Print module-level diagnostics for manifest size/debugging.
 * Useful to confirm included files and detect recursion-like duplication.
 * @param {any[]} modules
 * @param {string} manifestMode
 */
export function logManifestModuleDiagnostics(modules, manifestMode) {
    /** @type {string[]} */
    const normalizedPaths = [];
    for (const mod of modules || []) {
        normalizedPaths.push(normalizeModulePath(mod.path));
    }

    /** @type {Map<string, number>} */
    const counts = new Map();
    for (const path of normalizedPaths) {
        counts.set(path, (counts.get(path) || 0) + 1);
    }
    const duplicatePaths = [...counts.entries()].filter(([, count]) => count > 1);

    const rows = (modules || []).map((mod) => {
        const declarations = mod.declarations || [];
        let attributes = 0;
        let members = 0;
        for (const decl of declarations) {
            attributes += (decl.attributes || []).length;
            members += (decl.members || []).length;
        }
        return {
            path: normalizeModulePath(mod.path),
            bytes: Buffer.byteLength(JSON.stringify(mod)),
            declarations: declarations.length,
            attributes,
            members
        };
    }).sort((left, right) => right.bytes - left.bytes);

    console.info(`[arpadroid-cem-plugin] mode=${manifestMode} modules=${(modules || []).length}`);
    console.info('[arpadroid-cem-plugin] included module paths:');
    for (const path of [...new Set(normalizedPaths)].sort()) {
        console.info(`  - ${path}`);
    }

    if (duplicatePaths.length) {
        console.info('[arpadroid-cem-plugin] duplicate module paths detected:');
        for (const [path, count] of duplicatePaths) {
            console.info(`  - ${path} x${count}`);
        }
    } else {
        console.info('[arpadroid-cem-plugin] duplicate module paths: none');
    }

    console.info('[arpadroid-cem-plugin] top module payload contributors:');
    for (const row of rows.slice(0, 10)) {
        console.info(
            `  - ${row.bytes} bytes | decl:${row.declarations} attr:${row.attributes} members:${row.members} | ${row.path}`
        );
    }
}
