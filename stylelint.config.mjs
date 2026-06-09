import stylelintOrder from 'stylelint-order';

/** @type {import("stylelint").Config} */
export default {
    plugins: [stylelintOrder],
    extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
    rules: {
        'selector-class-pattern': '^[a-z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*(?:__[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?$',
        'keyframes-name-pattern': '^[a-z][a-zA-Z0-9]*$',
        'custom-property-pattern': '^[a-z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*$'
    }
};
