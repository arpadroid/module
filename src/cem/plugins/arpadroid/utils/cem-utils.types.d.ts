import { ManifestModeType } from '../../../../project/helpers/manifest/projectManifest.helper.types.js';

export type NodeType = {
    className?: string;
    tagName?: string;
    attributes?: AttributeDescriptorType[];
    name?: string;
};

export type TextType = { summary: string; serializedAs: string };

export type DescriptorType = {
    name: string;
    originalTypeText?: string;
    typeText: string;
    optional: boolean;
    jsDoc?: string;
};

export type AttributeDescriptorType = {
    name: string;
    type: { text: string; summary: string; detail?: string };
    serializedAs: string;
    description?: string;
    optional: boolean;
};

export type ManifestFilterPolicyPresets = Record<ManifestModeType, ManifestFilterPolicy>;

export type ManifestFilterPolicy = {
    /**
     * Enabled: unregistered modules are excluded from the manifest, reducing noise but hiding those symbols
     * from manifest-driven discovery/completions. Disabled: all analyzed modules remain visible.
     */
    omitUnregisteredModules?: boolean;
    /**
     * Enabled: inherited members are removed, which can make subclass IntelliSense appear incomplete.
     * Disabled: inherited APIs remain visible, improving discoverability at the cost of larger payloads.
     */
    omitInheritedMembers?: boolean;
    /**
     * Enabled: private/# members are hidden from hints and generated API views.
     * Disabled: private internals may appear in tooling output.
     */
    omitPrivateMembers?: boolean;
    /**
     * Enabled: underscore methods are removed from method completion lists.
     * Disabled: internal helper methods may still appear in suggestions.
     */
    omitUnderscoreMethods?: boolean;
    /**
     * Enabled: underscore properties/fields are removed from property hints.
     * Disabled: internal state fields may appear in autocomplete.
     */
    omitUnderscoreProperties?: boolean;
    /**
     * Enabled: removes mostly structural metadata with little to no visible IDE impact in most setups.
     * Disabled: keeps explicit module kind information for tools that inspect raw CEM structure.
     */
    omitModuleKind?: boolean;
    /**
     * Enabled: removes explicit customElement flags; some tools may rely on tagName/heuristics instead.
     * Disabled: keeps an explicit custom-element marker that can simplify downstream indexing.
     */
    omitDeclarationCustomElement?: boolean;
    /**
     * Enabled: keeps superclass names but drops module path context, which can weaken cross-file lineage tracing.
     * Disabled: preserves inheritance module references, helping advanced navigation/debug tooling.
     */
    omitSuperclassModule?: boolean;
    /**
     * Enabled: inherited attribute origin keeps class name but loses module path provenance.
     * Disabled: preserves full inherited origin context for richer diagnostics/tooling.
     */
    omitInheritedFromModule?: boolean;
    /**
     * Enabled: reduces export-to-source linkage detail for some navigation pipelines.
     * Disabled: keeps export declaration module references for better traceability.
     */
    omitExportDeclarationModule?: boolean;
    /**
     * Enabled: removes most hover/help documentation text from manifest-driven IDE features.
     * Disabled: keeps richer inline docs and tooltips.
     */
    omitDescriptions?: boolean;
    /**
     * Enabled: method signature help loses parameter names/defaults/descriptions.
     * Disabled: preserves richer call-site assistance.
     */
    omitMemberParameters?: boolean;
    /**
     * Enabled: keeps core type text but drops summary-level type metadata in richer UIs.
     * Disabled: preserves extra summarized type hints.
     */
    omitTypeSummary?: boolean;
    /**
     * Enabled: drops expanded type details that some IDE integrations show in advanced hovers.
     * Disabled: retains richer type-detail context.
     */
    omitTypeDetail?: boolean;
    /**
     * Enabled: required-vs-optional cues may disappear in completions/signature help.
     * Disabled: keeps optionality information for better guidance.
     */
    omitOptional?: boolean;
    /**
     * Enabled: export mapping can be unavailable for tools that depend on manifest exports.
     * Disabled: preserves export-level symbol linkage.
     */
    omitExports?: boolean;
    /**
     * Enabled: export entries keep less declaration linkage, reducing some navigation fidelity.
     * Disabled: keeps stronger export-to-declaration mapping.
     */
    omitExportDeclaration?: boolean;
    /**
     * Enabled: applies aggressive Storybook-centric compaction and can remove IDE-facing metadata.
     * Disabled: preserves generic manifest shape for broader editor tooling compatibility.
     */
    pruneForStorybook?: boolean;
};
