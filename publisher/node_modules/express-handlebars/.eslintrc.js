module.exports = {
	env: {
		node: true,
		jest: true,
	},
	extends: [
		"standard",
	],
	parserOptions: {
		ecmaVersion: 2018,
	},
	rules: {
		quotes: ["error", "double"],
		semi: ["error", "always"],
		"no-warning-comments": "warn",
		"comma-dangle": ["error", "always-multiline"],
		indent: ["error", "tab", { SwitchCase: 1 }],
		"no-tabs": "off",
		"no-var": "error",
		"prefer-const": "error",
		"object-shorthand": "error",
		"no-restricted-globals": [
			"error",
			{
				name: "fit",
				message: "Do not commit focused tests.",
			},
			{
				name: "fdescribe",
				message: "Do not commit focused tests.",
			},
		],
	},
};
