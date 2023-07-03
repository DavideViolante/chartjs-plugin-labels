import { fontString } from 'chart.js/helpers';
import Chart, {
  ChartComponentLike,
  ChartConfiguration,
  ChartType,
} from 'chart.js/auto';

/**
 * The label seems to be a string most of the time.
 * However, sometimes we have an extra check for width and height.
 * TODO: Investigate the `label: string | LabelMetrics`
 * remove LabelMetrics if not needed.
 * */

interface LabelMetrics {
  width: number;
  height: number;
}

interface RenderInfo {
  x: number;
  y: number;
}

enum LabelPosition {
  OUTSIDE = 'outside',
  BORDER = 'border',
  DEFAULT = 'default',
}

type BooleanMap = { [id: string]: boolean };
type ChartWithCircumference = 'pie' | 'doughnut';

const EMPTY_LINE_SEPARATOR = '\n';
const SUPPORTED_TYPES: ChartType[] = ['pie', 'doughnut', 'polarArea', 'bar'];
const SUPPORTED_TYPES_MAP: BooleanMap = SUPPORTED_TYPES.reduce(
  (acc: BooleanMap, id: ChartType) => {
    acc[id] = true;
    return acc;
  },
  {},
);

const isAllowedType = (type: string): boolean => SUPPORTED_TYPES_MAP[type];

const isPluginsLabelsDefined = (options: any): boolean => {
  const chartConfig: any = options?._context?.chart?.config?._config;
  return !!chartConfig?.options?.plugins?.labels;
};

export const PLUGIN_ID = 'labels';
export const getChartLabelPlugin = (): ChartComponentLike => ({
  id: PLUGIN_ID,
  beforeDatasetsUpdate: function (chart: any, args: any, options: any): void {
    if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
      return;
    }
    if (!options.length) {
      options = [options];
    }
    const count = options.length;
    if (!chart._labels || count !== chart._labels.length) {
      chart._labels = options.map(function () {
        return new ChartLabel();
      });
    }
    let someOutside = false;
    let maxPadding = 0;
    for (let i = 0; i < count; ++i) {
      const label: ChartLabel = chart._labels[i];
      label.setup(chart, options[i]);

      if (label.options.position === LabelPosition.OUTSIDE) {
        someOutside = true;
        const padding =
          label.options.fontSize * 1.5 + label.options.outsidePadding;
        if (padding > maxPadding) {
          maxPadding = padding;
        }
      }
    }
    if (someOutside) {
      chart.chartArea.top += maxPadding;
      chart.chartArea.bottom -= maxPadding;
    }
  },
  afterDatasetUpdate: function (chart: any, args: any, options: any): void {
    if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
      return;
    }
    chart._labels?.forEach(function (label: any): void {
      label.args[args.index] = args;
    });
  },
  beforeDraw: function (chart: any, args: any, options: any): void {
    if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
      return;
    }
    chart._labels?.forEach(function (label: any): void {
      label.barTotalPercentage = {};
    });
  },
  afterDatasetsDraw: function (chart: any, args: any, options: any): void {
    if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
      return;
    }
    chart._labels?.forEach(function (label: any): void {
      label.render();
    });
  },
});

export class ChartLabel {
  chart: Chart;
  ctx: any;
  args: any;
  percentage: any;
  totalPercentage: any;
  barTotalPercentage: any;
  total: any;
  barTotal: any;
  options: any;
  labelBounds: any;

  public setup(chart: Chart, options: any): void {
    this.chart = chart;
    this.ctx = chart.ctx;
    this.args = {};
    this.barTotal = {};
    const chartOptions = chart.config.options;

    this.options = Object.assign(
      {
        position: LabelPosition.DEFAULT,
        precision: 0,
        fontSize: chartOptions.font ? chartOptions.font.size : 12,
        fontColor: chartOptions.color || '#333333',
        fontStyle: chartOptions.font ? chartOptions.font.style : 'normal',
        fontFamily: chartOptions.font
          ? chartOptions.font.family
          : '\'Helvetica Neue\', \'Helvetica\', \'Arial\', sans-serif',
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowBlur: 6,
        images: [],
        outsidePadding: 2,
        textMargin: 2,
        overlap: true,
      },
      options,
    );
    const config: ChartConfiguration = chart?.config as ChartConfiguration;
    if (config.type === 'bar') {
      this.options.position = LabelPosition.DEFAULT;
      this.options.arc = false;
      this.options.overlap = true;
    }
  }

  private render(): void {
    this.labelBounds = [];
    this.chart.data.datasets.forEach((d: any, i: number) =>
      this.renderToDataset.bind(this)(d, i),
    );
  }

  private renderToDataset(dataset: any, index: number): void {
    this.totalPercentage = 0;
    this.total = null;
    const arg = this.args[index];
    arg.meta.data.forEach((element: any, index: number) =>
      this.renderToElement.bind(this)(dataset, arg, element, index),
    );
  }

  private renderToElement(
    dataset: any,
    arg: any,
    element: any,
    index: number,
  ): void {
    if (!this.shouldRenderToElement(arg.meta, element)) {
      return;
    }
    this.percentage = null;
    const label = this.getLabel(dataset, element, index);
    if (!label) {
      return;
    }
    const ctx = this.ctx;
    ctx.save();

    const font: string = fontString(
      this.options.fontSize,
      this.options.fontStyle,
      this.options.fontFamily,
    );
    if (font) {
      ctx.font = font;
    }

    const renderInfo = this.getRenderInfo(element, label);
    if (!this.drawable(element, label, renderInfo)) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.fillStyle = this.getFontColor(dataset, element, index);
    this.renderLabel(label, renderInfo);
    ctx.restore();
  }

  private renderLabel(label: string | LabelMetrics, renderInfo: any): void {
    return this.options.arc
      ? this.renderArcLabel(label, renderInfo)
      : this.renderBaseLabel(label, renderInfo);
  }

  private renderBaseLabel(label: string | LabelMetrics, position: any): void {
    const ctx = this.ctx;
    if (typeof label === 'object') {
      ctx.drawImage(
        label,
        position.x - label.width / 2,
        position.y - label.height / 2,
        label.width,
        label.height,
      );
      return;
    }

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    if (this.options.textShadow) {
      ctx.shadowOffsetX = this.options.shadowOffsetX;
      ctx.shadowOffsetY = this.options.shadowOffsetY;
      ctx.shadowColor = this.options.shadowColor;
      ctx.shadowBlur = this.options.shadowBlur;
    }

    const lines = label.split(EMPTY_LINE_SEPARATOR);
    for (let i = 0; i < lines.length; i++) {
      const y: number =
        position.y -
        (this.options.fontSize / 2) * lines.length +
        this.options.fontSize * i;
      ctx.fillText(lines[i], position.x, y);
    }
    ctx.restore();
  }

  private renderArcLabel(label: string | LabelMetrics, renderInfo: any): void {
    const ctx = this.ctx;
    const radius = renderInfo.radius;
    const view = renderInfo.view;

    ctx.save();
    ctx.translate(view.x, view.y);

    if (typeof label === 'string') {
      ctx.rotate(renderInfo.startAngle);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      let max = 0;
      const lines: string[] = label.split(EMPTY_LINE_SEPARATOR);
      const widths: number[] = [];
      const offset: number =
        this.options.position === LabelPosition.BORDER
          ? ((lines.length - 1) * this.options.fontSize) / 2
          : 0;

      for (let j = 0; j < lines.length; ++j) {
        const metrics: TextMetrics = this.ctx.measureText(lines[j]);
        if (metrics.width > max) {
          max = metrics.width;
        }
        widths.push(metrics.width);
      }

      for (let j = 0; j < lines.length; ++j) {
        const line = lines[j];
        const y = (lines.length - 1 - j) * -this.options.fontSize + offset;
        ctx.save();
        const padding = (max - widths[j]) / 2;
        ctx.rotate(padding / radius);
        for (let i = 0; i < line.length; i++) {
          const char = line.charAt(i);
          const metrics: TextMetrics = this.ctx.measureText(char);
          ctx.save();
          ctx.translate(0, -1 * radius);
          ctx.fillText(char, 0, y);
          ctx.restore();
          ctx.rotate(metrics.width / radius);
        }
        ctx.restore();
      }
    } else {
      ctx.rotate((view.startAngle + Math.PI / 2 + renderInfo.endAngle) / 2);
      ctx.translate(0, -1 * radius);
      this.renderLabel(label, { x: 0, y: 0 });
    }
    ctx.restore();
  }

  private shouldRenderToElement(meta: any, element: any): boolean {
    return (
      !meta.hidden &&
      (this.options.showZero || this.isChartType(this.chart, 'polarArea')
        ? element.outerRadius !== 0
        : element.circumference !== 0)
    );
  }

  /**
   * TODO: Investigate what the label type might be.
   * It might not be LabelMetrics, but often times it is a string.
   * */
  private getLabel(
    dataset: any,
    element: any,
    index: any,
  ): string | LabelMetrics {
    let label;
    if (typeof this.options.render === 'function') {
      label = this.options.render({
        label: this.chart.config.data.labels[index],
        value: dataset.data[index],
        percentage: this.getPercentage(dataset, element, index),
        dataset,
        index,
      });
    } else {
      switch (this.options.render) {
        case 'value':
          label = dataset.data[index];
          break;
        case 'label':
          label = this.chart.config.data.labels[index];
          break;
        case 'image':
          label = this.options.images[index]
            ? this.loadImage(this.options.images[index])
            : '';
          break;
        case 'percentage':
        default:
          label = this.getPercentage(dataset, element, index) + '%';
          break;
      }
    }
    if (typeof label === 'object') {
      label = this.loadImage(label);
    } else if (label) {
      label = label.toString();
    }
    return label;
  }

  private getFontColor(dataset: any, element: any, index: number): any {
    let fontColor = this.options.fontColor;
    if (typeof fontColor === 'function') {
      fontColor = fontColor({
        label: this.chart.config.data.labels[index],
        value: dataset.data[index],
        percentage: this.getPercentage(dataset, element, index),
        backgroundColor: dataset.backgroundColor[index],
        dataset,
        index,
      });
    } else if (typeof fontColor !== 'string') {
      fontColor = fontColor[index] || this.chart.config.options.color;
    }
    return fontColor;
  }

  private getPercentage(dataset: any, element: any, index: number): number {
    if (this.percentage) {
      return this.percentage;
    }
    let percentage: number;
    if (
      this.isChartType(this.chart, 'polarArea') ||
      this.isChartType(this.chart, 'doughnut') ||
      this.isChartType(this.chart, 'pie')
    ) {
      if (!this.total) {
        this.total = 0;
        for (let i = 0; i < dataset.data.length; ++i) {
          this.total += dataset.data[i];
        }
      }
      percentage = (dataset.data[index] / this.total) * 100;
    } else if (this.isChartType(this.chart, 'bar')) {
      if (!this.barTotal[index]) {
        this.barTotal[index] = 0;
        for (let i = 0; i < this.chart.data.datasets.length; ++i) {
          this.barTotal[index] += this.chart.data.datasets[i].data[index];
        }
      }
      percentage = (dataset.data[index] / this.barTotal[index]) * 100;
    } else {
      const circumference: number = (
        this.chart.config as ChartConfiguration<ChartWithCircumference>
      ).options.circumference;
      percentage = (element.circumference / circumference) * 100;
    }
    percentage = parseFloat(percentage.toFixed(this.options.precision));
    if (!this.options.showActualPercentages) {
      if (this.isChartType(this.chart, 'bar')) {
        this.totalPercentage = this.barTotalPercentage[index] || 0;
      }
      this.totalPercentage += percentage;
      if (this.totalPercentage > 100) {
        percentage -= this.totalPercentage - 100;
        percentage = parseFloat(percentage.toFixed(this.options.precision));
      }
      if (this.isChartType(this.chart, 'bar')) {
        this.barTotalPercentage[index] = this.totalPercentage;
      }
    }
    this.percentage = percentage;
    return percentage;
  }

  private getRenderInfo(element: any, label: any): any {
    if (this.isChartType(this.chart, 'bar')) {
      return this.getBarRenderInfo(element, label);
    } else {
      return this.options.arc
        ? this.getArcRenderInfo(element, label)
        : this.getBaseRenderInfo(element, label);
    }
  }

  private getBaseRenderInfo(element: any, label: any): any {
    if (
      this.options.position === LabelPosition.OUTSIDE ||
      this.options.position === LabelPosition.BORDER
    ) {
      let rangeFromCentre: number;
      const view = element;
      const centreAngle =
        view.startAngle + (view.endAngle - view.startAngle) / 2;
      const innerRadius = view.outerRadius / 2;
      if (this.options.position === LabelPosition.BORDER) {
        rangeFromCentre = (view.outerRadius - innerRadius) / 2 + innerRadius;
      } else if (this.options.position === LabelPosition.OUTSIDE) {
        rangeFromCentre =
          view.outerRadius -
          innerRadius +
          innerRadius +
          this.options.textMargin;
      }
      const renderInfo: RenderInfo = {
        x: view.x + Math.cos(centreAngle) * rangeFromCentre,
        y: view.y + Math.sin(centreAngle) * rangeFromCentre,
      };
      if (this.options.position === LabelPosition.OUTSIDE) {
        const offset: number =
          this.options.textMargin + this.measureLabel(label).width / 2;
        renderInfo.x += renderInfo.x < view.x ? -offset : offset;
      }
      return renderInfo;
    } else {
      return element.tooltipPosition();
    }
  }

  private getArcRenderInfo(element: any, label: any): any {
    let radius;
    const view = element;
    if (this.options.position === LabelPosition.OUTSIDE) {
      radius =
        view.outerRadius + this.options.fontSize + this.options.textMargin;
    } else if (this.options.position === LabelPosition.BORDER) {
      radius = (view.outerRadius / 2 + view.outerRadius) / 2;
    } else {
      radius = (view.innerRadius + view.outerRadius) / 2;
    }
    let startAngle = view.startAngle,
      endAngle = view.endAngle;
    const totalAngle = endAngle - startAngle;
    startAngle += Math.PI / 2;
    endAngle += Math.PI / 2;
    const metrics: LabelMetrics = this.measureLabel(label);
    startAngle += (endAngle - (metrics.width / radius + startAngle)) / 2;
    return { radius, startAngle, endAngle, totalAngle, view };
  }

  private getBarRenderInfo(element: any, label: any): any {
    const renderInfo = element.tooltipPosition();
    renderInfo.y -=
      this.measureLabel(label).height / 2 + this.options.textMargin;
    return renderInfo;
  }

  private outsideInRange(
    left: any,
    right: any,
    top: any,
    bottom: any,
  ): boolean {
    const labelBounds = this.labelBounds;
    for (let i = 0; i < labelBounds.length; ++i) {
      const bound = labelBounds[i];
      let potins = [
        [left, top],
        [left, bottom],
        [right, top],
        [right, bottom],
      ];
      for (let j = 0; j < potins.length; ++j) {
        const x = potins[j][0];
        const y = potins[j][1];
        if (
          x >= bound.left &&
          x <= bound.right &&
          y >= bound.top &&
          y <= bound.bottom
        ) {
          return false;
        }
      }
      potins = [
        [bound.left, bound.top],
        [bound.left, bound.bottom],
        [bound.right, bound.top],
        [bound.right, bound.bottom],
      ];
      for (let j = 0; j < potins.length; ++j) {
        const x = potins[j][0];
        const y = potins[j][1];
        if (x >= left && x <= right && y >= top && y <= bottom) {
          return false;
        }
      }
    }
    labelBounds.push({ left, right, top, bottom });
    return true;
  }

  private drawable(
    element: any,
    label: LabelMetrics | string,
    renderInfo: any,
  ): boolean {
    if (this.options.overlap) {
      return true;
    }

    if (this.options.arc) {
      return (
        renderInfo.endAngle - renderInfo.startAngle <= renderInfo.totalAngle
      );
    }

    const metrics: LabelMetrics = this.measureLabel(label);
    const left: number = renderInfo.x - metrics.width / 2;
    const right: number = renderInfo.x + metrics.width / 2;
    const top: number = renderInfo.y - metrics.height / 2;
    const bottom: number = renderInfo.y + metrics.height / 2;

    if (this.options.position === LabelPosition.OUTSIDE) {
      return this.outsideInRange(left, right, top, bottom);
    }

    return (
      element.inRange(left, top) &&
      element.inRange(left, bottom) &&
      element.inRange(right, top) &&
      element.inRange(right, bottom)
    );
  }

  private measureLabel(label: string | LabelMetrics): LabelMetrics {
    if (typeof label === 'object') {
      return { width: label.width, height: label.height };
    }

    const lines: string[] = label.split(EMPTY_LINE_SEPARATOR);
    const width: number = lines.reduce((acc: number, item: string): number => {
      const result: TextMetrics = this.ctx.measureText(item);
      return result.width > acc ? result.width : acc;
    }, 0);
    const height: number = this.options.fontSize * lines.length;
    return { width, height };
  }

  private loadImage(imgObject: HTMLImageElement): HTMLImageElement {
    const image: HTMLImageElement = new Image();
    image.src = imgObject.src;
    image.width = imgObject.width;
    image.height = imgObject.height;
    return image;
  }

  private isChartType(chart: Chart, type: ChartType): boolean {
    const config: ChartConfiguration = chart?.config as ChartConfiguration;
    return config?.type === type;
  }
}
