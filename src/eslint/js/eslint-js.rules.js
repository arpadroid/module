const rules = {
    'ban-ts-comment': 'off',
    indent: [
        'error',
        4,
        {
            SwitchCase: 1,
            VariableDeclarator: 1,
            outerIIFEBody: 1,
            MemberExpression: 1,
            FunctionDeclaration: { parameters: 1, body: 1 },
            FunctionExpression: { parameters: 1, body: 1 },
            CallExpression: { arguments: 1 },
            ArrayExpression: 1,
            ObjectExpression: 1,
            ImportDeclaration: 1,
            flatTernaryExpressions: false,
            ignoreComments: false,
            ignoredNodes: ['TemplateLiteral *'],
            offsetTernaryExpressions: true
        }
    ],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'always'],
    'arrow-body-style': 'off',
    'arrow-parens': ['off', 'as-needed'],
    complexity: 'off',
    'constructor-super': 'error',
    // curly: 'error',
    'sonarjs/os-command': 'off',
    'dot-notation': 'error',
    'eol-last': 'error',
    'guard-for-in': 'error',
    'id-length': [
        'error',
        {
            exceptions: ['_', 'i', 'x', 'y', 'z']
        }
    ],
    'max-classes-per-file': ['error', 1],
    'new-parens': 'error',
    'no-bitwise': 'error',
    'no-caller': 'error',
    'no-cond-assign': 'error',
    'no-console': 'off',
    'no-dupe-class-members': 'error',
    'no-debugger': 'error',
    'sonarjs/no-commented-code': 'off',
    'sonarjs/public-static-readonly': 'off',
    'sonarjs/pseudo-random': 'off',
    'sonarjs/no-internal-api-use': 'off',
    'sonarjs/no-dead-store': 'off',
    'sonarjs/todo-tag': 'off',
    'sonarjs/no-invariant-returns': 'off',
    'sonarjs/no-os-command-from-path': 'off',
    'no-unused-private-class-members': 'error',
    'no-empty': 'error',
    // 'no-empty-functions': 'error',
    'no-const-assign': 'error',
    'no-eval': 'error',
    'no-fallthrough': 'error',
    'no-invalid-this': 'error',
    'no-multiple-empty-lines': 'error',
    'no-new-wrappers': 'error',
    'no-throw-literal': 'error',
    'no-undef': 'error',
    'no-unsafe-finally': 'error',
    'no-unused-labels': 'error',
    'no-unused-vars': [
        'error',
        {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            args: 'after-used',
            vars: 'all'
        }
    ],
    'no-var': 'error',
    'object-shorthand': 'error',
    'one-var': ['error', 'never'],
    'prefer-const': 'error',
    'quote-props': ['error', 'as-needed'],
    radix: 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    'no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }
    ],
    // 'no-unused-private-class-members': 'off',
    'no-useless-call': 'error',
    'no-use-before-define': 'warn',
    'no-unreachable': 'error',
    'security/detect-object-injection': 'off',
    'jsdoc/check-access': 1, // Recommended
    'jsdoc/check-alignment': 1, // Recommended
    'jsdoc/check-examples': 'off',
    'jsdoc/check-indentation': 1,
    'jsdoc/check-line-alignment': 1,
    'jsdoc/check-param-names': 1, // Recommended
    'jsdoc/check-property-names': 1, // Recommended
    'jsdoc/check-syntax': 1,
    'jsdoc/check-tag-names': 1, // Recommended
    'jsdoc/check-types': 1, // Recommended
    'jsdoc/check-values': 1, // Recommended
    'jsdoc/empty-tags': 1, // Recommended
    'jsdoc/implements-on-classes': 1, // Recommended
    'jsdoc/informative-docs': 1,
    'jsdoc/match-description': 1,
    'jsdoc/multiline-blocks': 1, // Recommended
    'jsdoc/no-bad-blocks': 1,
    'jsdoc/no-blank-block-descriptions': 1,
    'jsdoc/no-defaults': 1,
    'jsdoc/no-missing-syntax': 'off',
    'jsdoc/no-multi-asterisks': 1, // Recommended
    'jsdoc/no-restricted-syntax': 'off',
    'jsdoc/no-types': 0,
    'jsdoc/no-undefined-types': 'error', // Recommended
    'jsdoc/require-asterisk-prefix': 1,
    'jsdoc/require-description': 1,
    'jsdoc/require-description-complete-sentence': 1,
    'jsdoc/require-example': 0,
    'jsdoc/require-file-overview': 0,
    'jsdoc/require-hyphen-before-param-description': 1,
    'jsdoc/require-jsdoc': 1, // Recommended
    'jsdoc/require-param': 1, // Recommended
    'jsdoc/require-param-description': 0, // Recommended
    'jsdoc/require-param-name': 1, // Recommended
    'jsdoc/require-param-type': 1, // Recommended
    'jsdoc/require-property': 1, // Recommended
    'jsdoc/require-property-description': 1, // Recommended
    'jsdoc/require-property-name': 1, // Recommended
    'jsdoc/require-property-type': 1, // Recommended
    'jsdoc/require-returns': 1, // Recommended
    'jsdoc/require-returns-check': 1, // Recommended
    'jsdoc/require-returns-description': 0, // Recommended
    'jsdoc/require-returns-type': 1, // Recommended
    'jsdoc/require-throws': 1,
    'jsdoc/require-yields': 1, // Recommended
    'jsdoc/require-yields-check': 1, // Recommended
    'jsdoc/sort-tags': 1,
    'jsdoc/tag-lines': 1, // Recommended
    'jsdoc/valid-types': 1, // Recommended
    'xss/no-mixed-html': 'off'
};

export default rules;
