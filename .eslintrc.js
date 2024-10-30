module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    overrides: [{
        files: ['*.ts'],
        parser: '@typescript-eslint/parser',
        parserOptions: {
            ecmaVersion: 12,
            sourceType: 'module',
            project: 'tsconfig.json',
        },
        plugins: [
            '@typescript-eslint',
            'jasmine',
        ],
        extends: [
            'eslint:recommended',
            'google',
            'plugin:@typescript-eslint/recommended',
            'plugin:@angular-eslint/recommended',
            'plugin:jasmine/recommended',
        ],
        rules: {
            '@typescript-eslint/no-floating-promises': ['error'],
            'jasmine/no-unsafe-spy': ['off'],
            'jasmine/no-expect-in-setup-teardown': ['off'],
            'jasmine/no-spec-dupes': ['error', 'branch'],
            'jasmine/no-suite-dupes': ['error', 'branch'],
            'jasmine/expect-matcher': ['error'],
            'jasmine/new-line-before-expect': ['off'],
            'jasmine/new-line-between-declarations': ['off'],
            'no-warning-comments': [
                'error',
                { 'terms': ['todo', 'fixme', 'xxx', 'review'], 'location': 'start' }
            ],
            'complexity': ['error', 20],
            '@angular-eslint/no-output-rename': ['warn'],
            '@angular-eslint/component-class-suffix': ['warn'],
            '@typescript-eslint/no-unnecessary-condition': ['warn'],
            '@typescript-eslint/no-unnecessary-type-arguments': ['warn'],
            '@typescript-eslint/no-unnecessary-type-assertion': ['warn'],
            '@typescript-eslint/no-unnecessary-type-constraint': ['warn'],
            '@typescript-eslint/prefer-for-of': ['warn'],
            '@typescript-eslint/prefer-nullish-coalescing': ['warn'],
            '@typescript-eslint/prefer-readonly': ['warn'],
            '@typescript-eslint/switch-exhaustiveness-check': ['warn'],
            '@typescript-eslint/no-unused-expressions': ['warn'],
            '@typescript-eslint/no-unused-vars': ['warn'],
            '@typescript-eslint/no-useless-constructor': ['warn'],
            '@typescript-eslint/typedef': [
                'error',
                {
                    'arrowParameter': true,
                    'memberVariableDeclaration': true,
                    'propertyDeclaration': true,
                    'variableDeclaration': true,
                    'parameter': true,
                },
            ],
            '@typescript-eslint/strict-boolean-expressions': ['warn'],
            '@typescript-eslint/no-empty-function': ['off'],
            '@typescript-eslint/no-namespace': ['off'],
            '@typescript-eslint/explicit-function-return-type': ['error'],
            '@typescript-eslint/no-empty-object-type': ['error'],
            '@typescript-eslint/no-unsafe-function-type': ['error'],
            '@typescript-eslint/no-wrapper-object-types': ['error'], // bans Object, Number, String, etc.
            '@typescript-eslint/no-this-alias': ['error'],
            '@typescript-eslint/no-inferrable-types': ['off'],
            '@typescript-eslint/no-redeclare': [
                'error',
                { 'ignoreDeclarationMerge': true },
            ],
            'dot-notation': ['warn'],
            'max-len': ['error', { 'code': 120, 'ignoreStrings': true, 'ignoreTemplateLiterals': true }],
            'require-jsdoc': ['error', { 'require': {
                'FunctionDeclaration': false,
                'MethodDefinition': false,
                'ClassDeclaration': false,
                'ArrowFunctionExpression': false,
                'FunctionExpression': false,
            }}],
            "@typescript-eslint/no-shadow": "error",
            'new-cap': ['off'], // Because there are false positives
            'no-undef': ['off'], // Because there are false positives
            'valid-jsdoc': ['off'], // Because we do not use jsdoc
            '@typescript-eslint/no-unused-vars': ['error', { 'args': 'none' }],
            'no-invalid-this': ['warn'],
            'indent': [
                'error', 4,
                {
                    'SwitchCase': 1,
                    'CallExpression': { 'arguments': 'first' },
                    'FunctionDeclaration': { 'parameters': 'first' },
                    'FunctionExpression': { 'parameters': 'first' },
                },
            ],
            'object-curly-spacing': ['error', 'always'],
            'no-redeclare': ['off'], // subsumed by typescript-eslint's rule
            'camelcase': ['error'],
            'no-case-declarations': ['off'],
            'padded-blocks': ['off'],
            'space-before-function-paren': ['error', {
                'anonymous': 'never',
                'named': 'never',
                'asyncArrow': 'never',
            }],
            'brace-style': ['off'],
            'eqeqeq': ['error', 'always', {
                'null': 'ignore',
            }],
            'max-lines-per-function': ['warn', 50]
        },
    }, {
        files: ['*.html'],
        parser: '@angular-eslint/template-parser',
        plugins: [
        ],
        extends: [
            'plugin:@angular-eslint/template/recommended',
        ],
        'rules': {
            '@angular-eslint/template/i18n': [
                'warn',
                {
                    'checkId': false,
                    'checkText': true,
                    'checkAttributes': true,
                    'ignoreTags': ['title', 'meta', 'app-chat'],
                    'ignoreAttributes': ['href', ':xlink:href', 'r', 'points', 'preserveAspectRatio', 'pointer-events', 'stroke-linecap', 'x', 'y', 'transform', 'refX', 'refY', 'marker-end', 'markerWidth', 'markerHeight', 'orient', 'dx', 'dy', 'text-anchor', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'fill-opacity', 'role', 'cx', 'stroke-dasharray', 'name', 'for', 'step', 'min', 'max', 'scope', 'routerLink', 'debugName', 'value', 'aria-label', 'data-target', 'maxlength', 'ngClass'],
                }
            ]
        },
    }]
};
