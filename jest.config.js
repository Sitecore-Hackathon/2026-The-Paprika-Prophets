/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // @faker-js/faker ships ESM — tell ts-jest to transform it
  transformIgnorePatterns: [
    "node_modules/(?!(@faker-js/faker)/)",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": ["ts-jest", { useESM: false }],
  },
  fakeTimers: { enableGlobally: false },
};
