module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/@prisma/', '<rootDir>/node_modules/.prisma/'],
  transformIgnorePatterns: [
    'node_modules/(?!supertest)',
    '.*\\.prisma.*'
  ]
}; 