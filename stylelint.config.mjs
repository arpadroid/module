import stylelintOrder from 'stylelint-order';
import remOverPx from 'stylelint-rem-over-px';

/** @type {import("stylelint").Config} */
export default {
    plugins: [stylelintOrder, remOverPx],
    extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
    rules: {
        'selector-class-pattern':
            '^[a-z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*(?:__[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*)?$',
        'keyframes-name-pattern': '^[a-z][a-zA-Z0-9]*$',
        'custom-property-pattern': '^[a-z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*$',
        'rem-over-px/rem-over-px': [
            true,
            {
                fontSize: 16,
                ignore: ['1px'],
                ignoreFunctions: ['url'],
                ignoreAtRules: ['media']
            }
        ]
    }
};
