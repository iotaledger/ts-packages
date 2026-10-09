module.exports = {
    clearMocks: true,
    coverageProvider: 'v8',
    transform: {
        '^.+\\.(ts|tsx)$': '@swc/jest',
    },
    moduleNameMapper: {
        '^@iota/core/constants/(.*)$': '<rootDir>/../core/src/constants/$1',
        '^@iota/core/utils/(.*)$': '<rootDir>/../core/src/utils/$1',
        '^@iota/core/interfaces/(.*)$': '<rootDir>/../core/src/interfaces/$1',
    },
    testPathIgnorePatterns: ['tests'],
};
