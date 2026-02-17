export type NodeType = {
    className?: string;
    tagName?: string;
    attributes?: AttributeDescriptorType[];
    name?: string;
};

export type TextType = { summary: string; serializedAs: string };

export type DescriptorType = {
    name: string;
    typeText: string;
    optional: boolean;
    jsDoc?: string;
};

export type AttributeDescriptorType = {
    name: string;
    type: { text: string; summary: string };
    serializedAs: string;
    description?: string;
    optional: boolean;
};
