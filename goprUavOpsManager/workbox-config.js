module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{js,html,png,ico}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	maximumFileSizeToCacheInBytes: 10 * 1024 ** 2,
	sourcemap: true,
};
