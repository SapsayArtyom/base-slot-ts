import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['dist'] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
		files: ['**/*.{ts,tsx,js,jsx}'],
		plugins: {
			prettier: eslintPluginPrettier,
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		rules: {
			'prettier/prettier': 'error',
		},
	}
);
