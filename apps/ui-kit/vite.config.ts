import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

const isPackageProduction = process.env.BUILD_ENV === 'package';
const packageConfig = {
    lib: {
        entry: resolve(__dirname, './src/lib/index.ts'),
        name: '@iota/apps-ui-kit',
        fileName: (format) => `index.${format}.js`,
        cssFileName: 'style',
    },
    rolldownOptions: {
        external: ['react', 'react-dom', 'tailwindcss', 'react/jsx-runtime'],
        output: {
            globals: {
                react: 'React',
                'react-dom': 'ReactDOM',
                tailwindcss: 'tailwindcss',
            },
        },
    },
    sourcemap: true,
    emptyOutDir: true,
};

const plugins = isPackageProduction
    ? [react(), dts({ rollupTypes: true })]
    : [react()];

const buildPackageConfig = {
    build: isPackageProduction ? packageConfig : {},
    plugins,
    resolve: {
        tsconfigPaths: true,
        alias: [
            {
                find: 'fs',
                replacement: 'memfs',
            },
        ],
    },
};

export default defineConfig(buildPackageConfig);
