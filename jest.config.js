const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/filestore/'],
  moduleNameMapper: {
    '^@/generated/prisma$': '<rootDir>/src/generated/prisma',
    '^@/generated/prisma/(.*)$': '<rootDir>/src/generated/prisma/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^next/(.*)$': '<rootDir>/node_modules/next/$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/jest.setup.js'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
    },
  },
};