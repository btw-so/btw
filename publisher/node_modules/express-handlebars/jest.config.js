module.exports = {
	restoreMocks: true,
	clearMocks: true,
	collectCoverageFrom: [
		"lib/**/*.js",
		"index.js",
		"!**/node_modules/**",
	],
	coverageDirectory: "coverage",
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
	testRegex: /\.test\.jsx?/.source,
};
