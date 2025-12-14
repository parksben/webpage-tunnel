import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/webpage-tunnel.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/webpage-tunnel.esm.js',
      format: 'es',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/webpage-tunnel.umd.js',
      format: 'umd',
      name: 'WebpageTunnel',
      sourcemap: true,
      exports: 'named',
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      rootDir: './src',
    }),
  ],
};
