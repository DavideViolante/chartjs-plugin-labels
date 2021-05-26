import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/chartjs-plugin-labels.js',
  output: [
    { file: 'build/chartjs-plugin-labels.min.js', format: 'umd', name: 'chartjs-plugin-labels', plugins: [terser()] },
  ],
};