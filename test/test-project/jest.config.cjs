module.exports = {
    verbose: true,
    coverageReporters: ['html', 'text', 'cobertura'],
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.?(m)js?(x)', '**/?(*.)(spec|test).?(m)js?(x)'],
    moduleFileExtensions: ['js', 'mjs'],
    setupFilesAfterEnv: ['<rootDir>/../setupTests.cjs'],
    transform: {
        '^.+\\.m?js$': 'babel-jest'
    },
    injectGlobals: true,
    fakeTimers: { enableGlobally: true },
    globals: {},
    transformIgnorePatterns: [
        'node_modules/(?!(@arpadroid|chokidar|readdirp|anymatch|normalize-path|picomatch|glob-parent|braces|fill-range|to-regex-range|is-number|is-extglob|is-glob|chalk|glob|minimatch|yargs|yargs-parser)/)'
    ],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                // outputDirectory: "",
                outputName: 'junit.xml'
            }
        ]
    ]
};
