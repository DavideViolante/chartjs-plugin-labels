/**
 * [chartjs-plugin-labels]{@link https://github.com/DavideViolante/chartjs-plugin-labels}
 *
 * @version 3.1.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com], Davide Violante, Yousef Altaher
 * @copyright Chen, Yi-Cyuan 2017-2018
 * @license MIT
 */

import {chartLabelPlugin} from './dist/esm/chart-label';
import Chart from 'chart.js/auto';

(function () {
  'use strict';

  if (typeof Chart === 'undefined') {
    console.error('Cannot find Chart object.');
    return;
  }

  const SUPPORTED_TYPES = {};
  ['pie', 'doughnut', 'polarArea', 'bar'].forEach(function (t) {
    SUPPORTED_TYPES[t] = true;
  });

  Chart.register(chartLabelPlugin);
})();
