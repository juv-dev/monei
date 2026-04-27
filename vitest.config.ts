import { configDefaults, defineConfig } from 'vitest/config';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';

const excludeFolders = [
	'src/assets/images/**',
	'**/constants/**',
	'**/schema/**',
	'**/routes/**',
	'src/config.ts',
	'src/App.vue',
	'src/main.ts',
];

export default defineConfig({
	plugins: [vue()],
	test: {
		globals: true,
		environment: 'jsdom',
		include: [`./test/**/*.{test,spec}.ts`],
		exclude: [...configDefaults.exclude, ...excludeFolders],
		setupFiles: fileURLToPath(new URL('./test/setup.ts', import.meta.url)),
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov', 'clover'],
			reportsDirectory: './coverage',
			exclude: [
				'src/plugins/**',
				'src/config/**',
				'src/main.ts',
				'src/App.vue',
				'src/**/*.d.ts',
				'src/shared/components/charts/DoughnutChart.vue',
				'src/**/http/interceptors/index.ts',
				'src/**/services/index.ts',
				'src/**/composables/index.ts',
				'src/**/store/index.ts',
				'src/**/types/**',
				'src/**/routes/**',
				'src/**/router/**',
				'src/**/constants/**',
				'src/**/schema/**',
				'src/**/adapters/index.ts',
				// Módulos nuevos aún sin tests
				'src/modules/creditos/**',
				'src/modules/reportes/**',
				'src/modules/auth/views/SsoCallbackView.vue',
				// Componentes UI que dependen de APIs del browser no disponibles en jsdom
				'src/shared/components/FloatingChatPanel.vue',
				'src/shared/components/FloatingChatbot.vue',
				'src/shared/components/ui/NetworkBanner.vue',
				'src/shared/composables/useNetworkStatus.ts',
			],
			include: ['src/**/*.{js,ts,vue}'],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 70,
				statements: 80,
			},
		},
	},
	resolve: {
		alias: {
			'~': resolve(__dirname, './src'),
		},
		dedupe: ['vue'],
	},
});
