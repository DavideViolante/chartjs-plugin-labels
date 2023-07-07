[![Maintainability](https://api.codeclimate.com/v1/badges/ded2c349739e4d87130b/maintainability)](https://codeclimate.com/github/DavideViolante/chart.js-plugin-labels-dv/maintainability) ![npm](https://img.shields.io/npm/dm/chart.js-plugin-labels-dv) [![Donate](https://img.shields.io/badge/paypal-donate-179BD7.svg)](https://www.paypal.me/dviolante)

[![NPM](https://nodei.co/npm/chart.js-plugin-labels-dv.png)](https://nodei.co/npm/chart.js-plugin-labels-dv/)

# Chart.js Plugin Labels for Chart.js v4+
[Chart.js](https://www.chartjs.org/) plugin to display labels on pie, doughnut and polar area chart. Forked from [emn178/chartjs-plugin-labels](https://github.com/emn178/chartjs-plugin-labels).

## Demo
- [Demo](http://emn178.github.io/chartjs-plugin-labels/samples/demo/) from the original repo using Chart.js v2.x, but it's almost the same.

## Download
- [Compressed](https://raw.github.com/DavideViolante/chartjs-plugin-labels/master/dist/chartjs-plugin-labels.min.js)  
- [Uncompressed](https://raw.github.com/DavideViolante/chartjs-plugin-labels/master/src/chartjs-plugin-labels.js)

## CDN Link
You can put the below link in the script tag

    https://unpkg.com/chart.js-plugin-labels-dv/dist/chartjs-plugin-labels.min.js

## Install from NPM
- `npm i chart.js-plugin-labels-dv`

## Usage
JavaScript
```js
new Chart(ctx, {
  type: type,
  data: data,
  options: {
    plugins: {
      labels: {
        // render 'label', 'value', 'percentage', 'image' or custom function, default is 'percentage'
        render: 'value',
        // precision for percentage, default is 0
        precision: 0,
        // identifies whether or not labels of value 0 are displayed, default is false
        showZero: true,
        // font size, default is defaultFontSize
        fontSize: 12,
        // font color, can be color array for each data or function for dynamic color, default is defaultFontColor
        fontColor: '#fff',
        // font style, default is defaultFontStyle
        fontStyle: 'normal',
        // font family, default is defaultFontFamily
        fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
        // draw text shadows under labels, default is false
        textShadow: true,
        // text shadow intensity, default is 6
        shadowBlur: 10,
        // text shadow X offset, default is 3
        shadowOffsetX: -5,
        // text shadow Y offset, default is 3
        shadowOffsetY: 5,
        // text shadow color, default is 'rgba(0,0,0,0.3)'
        shadowColor: 'rgba(255,0,0,0.75)',
        // draw label in arc, default is false
        // bar chart ignores this
        arc: true,
        // position to draw label, available value is 'default', 'border' and 'outside'
        // bar chart ignores this
        // default is 'default'
        position: 'default',
        // draw label even it's overlap, default is true
        // bar chart ignores this
        overlap: true,
        // show the real calculated percentages from the values and don't apply the additional logic to fit the percentages to 100 in total, default is false
        showActualPercentages: true,
        // set images when `render` is 'image'
        images: [
          {
            src: 'image.png',
            width: 16,
            height: 16
          }
        ],
        // add padding when position is `outside`
        // default is 2
        outsidePadding: 4,
        // add margin of text when position is `outside` or `border`
        // default is 2
        textMargin: 4
      }
    }
  }
});

// custom render
{
  render: function (args) {
    // args will be something like:
    // { label: 'Label', value: 123, percentage: 50, index: 0, dataset: {...} }
    return '$' + args.value;
    // return object if it is image
    // return { src: 'image.png', width: 16, height: 16 };
  }
}

// dynamic fontColor
{
  fontColor: function (args) {
    // args will be something like:
    // { index: 0, dataset: {...} }
    return myColorTransfer(args.dataset.backgroundColor[index]);
  }
}
```

Support multiple options, eg.

```js
labels: [
  {
    render: 'label',
    position: 'outside'
  },
  {
    render: 'value'
  }
]
```

Default options

```js
Chart.defaults.plugins.labels = {
  // ...
};
```

### React
From https://github.com/DavideViolante/chartjs-plugin-labels/issues/5#issuecomment-1237995604
```ts
import React from 'react';
import { Chart } from 'chart.js';
import * as helpers from 'chart.js/helpers';

export const LabelPluginProvider: React.FC = ({ children }) => {
  React.useEffect(() => {
    window.Chart = Chart;
    Chart.helpers = helpers;
    import('chart.js-plugin-labels-dv');
  }, []);
  return children;
};
```

### Vue
From https://github.com/DavideViolante/chartjs-plugin-labels/issues/2#issuecomment-1483948596
```ts
import Chart from "chart.js/auto";
import * as helpers from "chart.js/helpers";
```
Then inside the `created()` hook:
```ts
async created() {
  window.Chart = Chart;
  Chart.helpers = helpers;
  awaitimport("chart.js-plugin-labels-dv");
}
```

### Angular
[Codesandbox example](https://codesandbox.io/p/sandbox/chart-js-plugin-demo-fmtvxd)

You would need to create your own chart component.
```html
<div class="chart">
  <canvas [id]="name"></canvas>
</div>
```

Importing should be straightforward
```ts
import Chart from 'chart.js/auto';
import { getChartLabelPlugin, PLUGIN_ID } from 'chart.js-plugin-labels-dv';
```

```ts
@Input() chartConfig: any;
@Output() chartCreated: EventEmitter<Chart> = new EventEmitter<Chart>();

public readonly name: string = `chart-${ChartComponent.instanceCount++}`;
private chart: Chart;

ngAfterViewInit(): void {
  this.createChart();
}

private createChart(): void {
  if (!this.hasRegisteredPlugin()) {
    Chart.register(getChartLabelPlugin());
  }
    
  this.chart = new Chart(this.name, this.chartConfig);
  this.chartCreated.emit(this.chart);
}

private hasRegisteredPlugin(): boolean {
    return !!Chart.registry?.plugins.get(PLUGIN_ID);
}
```

For fixing the module failed compilation error I have updated tsconfig as follows:

```
Error: Module build failed (from ./node_modules/@ngtools/webpack/src/ivy/index.js):
Error: /node_modules/chart.js-plugin-labels-dv/src/chart-label.ts is missing from the TypeScript compilation.
Please make sure it is in your tsconfig via the 'files' or 'include' property.
```

tsconfig.json
```json
"files": [
  ...
  "node_modules/chart.js-plugin-labels-ed/src/chart-label.ts"
],
```

Test it out with data from the official Chart.js website: https://www.chartjs.org/docs/latest/charts/doughnut.html#pie

## License
[MIT license](http://www.opensource.org/licenses/MIT).

## Contact
The project's website is located at https://github.com/emn178/chartjs-plugin-labels  
Authors: Chen, Yi-Cyuan (emn178@gmail.com), Davide Violante, eduard-landclan
