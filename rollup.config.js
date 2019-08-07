import pkg from './package.json';

export default [
	{
		input: 'src/dysc.js',
		output: {
			name: 'Dysc',
			file: pkg.browser,
			format: 'umd'
		},
	},
	{
		input: 'src/dysc.js',
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		]
	}
];