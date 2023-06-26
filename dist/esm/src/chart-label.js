import { fontString } from 'chart.js/helpers';
var LabelPosition;
(function (LabelPosition) {
    LabelPosition["OUTSIDE"] = "outside";
    LabelPosition["BORDER"] = "border";
    LabelPosition["DEFAULT"] = "default";
})(LabelPosition || (LabelPosition = {}));
var EMPTY_LINE_SEPARATOR = '\n';
var SUPPORTED_TYPES = ['pie', 'doughnut', 'polarArea', 'bar'];
var SUPPORTED_TYPES_MAP = SUPPORTED_TYPES.reduce(function (acc, id) {
    acc[id] = true;
    return acc;
}, {});
var isAllowedType = function (type) { return SUPPORTED_TYPES_MAP[type]; };
var isPluginsLabelsDefined = function (options) {
    var _a, _b, _c, _d, _e;
    var chartConfig = (_c = (_b = (_a = options === null || options === void 0 ? void 0 : options._context) === null || _a === void 0 ? void 0 : _a.chart) === null || _b === void 0 ? void 0 : _b.config) === null || _c === void 0 ? void 0 : _c._config;
    return !!((_e = (_d = chartConfig === null || chartConfig === void 0 ? void 0 : chartConfig.options) === null || _d === void 0 ? void 0 : _d.plugins) === null || _e === void 0 ? void 0 : _e.labels);
};
export var PLUGIN_ID = 'labels';
export var getChartLabelPlugin = function () { return ({
    id: PLUGIN_ID,
    beforeDatasetsUpdate: function (chart, args, options) {
        if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
            return;
        }
        if (!options.length) {
            options = [options];
        }
        var count = options.length;
        if (!chart._labels || count !== chart._labels.length) {
            chart._labels = options.map(function () {
                return new ChartLabel();
            });
        }
        var someOutside = false;
        var maxPadding = 0;
        for (var i = 0; i < count; ++i) {
            var label = chart._labels[i];
            label.setup(chart, options[i]);
            if (label.options.position === LabelPosition.OUTSIDE) {
                someOutside = true;
                var padding = label.options.fontSize * 1.5 + label.options.outsidePadding;
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
    afterDatasetUpdate: function (chart, args, options) {
        var _a;
        if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
            return;
        }
        (_a = chart._labels) === null || _a === void 0 ? void 0 : _a.forEach(function (label) {
            label.args[args.index] = args;
        });
    },
    beforeDraw: function (chart, args, options) {
        var _a;
        if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
            return;
        }
        (_a = chart._labels) === null || _a === void 0 ? void 0 : _a.forEach(function (label) {
            label.barTotalPercentage = {};
        });
    },
    afterDatasetsDraw: function (chart, args, options) {
        var _a;
        if (!isAllowedType(chart.config.type) || !isPluginsLabelsDefined(options)) {
            return;
        }
        (_a = chart._labels) === null || _a === void 0 ? void 0 : _a.forEach(function (label) {
            label.render();
        });
    }
}); };
var ChartLabel = (function () {
    function ChartLabel() {
    }
    ChartLabel.prototype.setup = function (chart, options) {
        this.chart = chart;
        this.ctx = chart.ctx;
        this.args = {};
        this.barTotal = {};
        var chartOptions = chart.config.options;
        this.options = Object.assign({
            position: LabelPosition.DEFAULT,
            precision: 0,
            fontSize: chartOptions.font ? chartOptions.font.size : 12,
            fontColor: chartOptions.color || '#333333',
            fontStyle: chartOptions.font ? chartOptions.font.style : 'normal',
            fontFamily: chartOptions.font
                ? chartOptions.font.family
                : "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
            shadowOffsetX: 3,
            shadowOffsetY: 3,
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 6,
            images: [],
            outsidePadding: 2,
            textMargin: 2,
            overlap: true
        }, options);
        var config = chart === null || chart === void 0 ? void 0 : chart.config;
        if (config.type === 'bar') {
            this.options.position = LabelPosition.DEFAULT;
            this.options.arc = false;
            this.options.overlap = true;
        }
    };
    ChartLabel.prototype.render = function () {
        var _this = this;
        this.labelBounds = [];
        this.chart.data.datasets.forEach(function (d, i) {
            return _this.renderToDataset.bind(_this)(d, i);
        });
    };
    ChartLabel.prototype.renderToDataset = function (dataset, index) {
        var _this = this;
        this.totalPercentage = 0;
        this.total = null;
        var arg = this.args[index];
        arg.meta.data.forEach(function (element, index) {
            return _this.renderToElement.bind(_this)(dataset, arg, element, index);
        });
    };
    ChartLabel.prototype.renderToElement = function (dataset, arg, element, index) {
        if (!this.shouldRenderToElement(arg.meta, element)) {
            return;
        }
        this.percentage = null;
        var label = this.getLabel(dataset, element, index);
        if (!label) {
            return;
        }
        var ctx = this.ctx;
        ctx.save();
        var font = fontString(this.options.fontSize, this.options.fontStyle, this.options.fontFamily);
        if (font) {
            ctx.font = font;
        }
        var renderInfo = this.getRenderInfo(element, label);
        if (!this.drawable(element, label, renderInfo)) {
            ctx.restore();
            return;
        }
        ctx.beginPath();
        ctx.fillStyle = this.getFontColor(dataset, element, index);
        this.renderLabel(label, renderInfo);
        ctx.restore();
    };
    ChartLabel.prototype.renderLabel = function (label, renderInfo) {
        return this.options.arc
            ? this.renderArcLabel(label, renderInfo)
            : this.renderBaseLabel(label, renderInfo);
    };
    ChartLabel.prototype.renderBaseLabel = function (label, position) {
        var ctx = this.ctx;
        if (typeof label === 'object') {
            ctx.drawImage(label, position.x - label.width / 2, position.y - label.height / 2, label.width, label.height);
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
        var lines = label.split(EMPTY_LINE_SEPARATOR);
        for (var i = 0; i < lines.length; i++) {
            var y = position.y -
                (this.options.fontSize / 2) * lines.length +
                this.options.fontSize * i;
            ctx.fillText(lines[i], position.x, y);
        }
        ctx.restore();
    };
    ChartLabel.prototype.renderArcLabel = function (label, renderInfo) {
        var ctx = this.ctx;
        var radius = renderInfo.radius;
        var view = renderInfo.view;
        ctx.save();
        ctx.translate(view.x, view.y);
        if (typeof label === 'string') {
            ctx.rotate(renderInfo.startAngle);
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            var max = 0;
            var lines = label.split(EMPTY_LINE_SEPARATOR);
            var widths = [];
            var offset = this.options.position === LabelPosition.BORDER
                ? ((lines.length - 1) * this.options.fontSize) / 2
                : 0;
            for (var j = 0; j < lines.length; ++j) {
                var metrics = this.ctx.measureText(lines[j]);
                if (metrics.width > max) {
                    max = metrics.width;
                }
                widths.push(metrics.width);
            }
            for (var j = 0; j < lines.length; ++j) {
                var line = lines[j];
                var y = (lines.length - 1 - j) * -this.options.fontSize + offset;
                ctx.save();
                var padding = (max - widths[j]) / 2;
                ctx.rotate(padding / radius);
                for (var i = 0; i < line.length; i++) {
                    var char = line.charAt(i);
                    var metrics = this.ctx.measureText(char);
                    ctx.save();
                    ctx.translate(0, -1 * radius);
                    ctx.fillText(char, 0, y);
                    ctx.restore();
                    ctx.rotate(metrics.width / radius);
                }
                ctx.restore();
            }
        }
        else {
            ctx.rotate((view.startAngle + Math.PI / 2 + renderInfo.endAngle) / 2);
            ctx.translate(0, -1 * radius);
            this.renderLabel(label, { x: 0, y: 0 });
        }
        ctx.restore();
    };
    ChartLabel.prototype.shouldRenderToElement = function (meta, element) {
        return (!meta.hidden &&
            (this.options.showZero || this.isChartType(this.chart, 'polarArea')
                ? element.outerRadius !== 0
                : element.circumference !== 0));
    };
    ChartLabel.prototype.getLabel = function (dataset, element, index) {
        var label;
        if (typeof this.options.render === 'function') {
            label = this.options.render({
                label: this.chart.config.data.labels[index],
                value: dataset.data[index],
                percentage: this.getPercentage(dataset, element, index),
                dataset: dataset,
                index: index
            });
        }
        else {
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
        }
        else if (label) {
            label = label.toString();
        }
        return label;
    };
    ChartLabel.prototype.getFontColor = function (dataset, element, index) {
        var fontColor = this.options.fontColor;
        if (typeof fontColor === 'function') {
            fontColor = fontColor({
                label: this.chart.config.data.labels[index],
                value: dataset.data[index],
                percentage: this.getPercentage(dataset, element, index),
                backgroundColor: dataset.backgroundColor[index],
                dataset: dataset,
                index: index
            });
        }
        else if (typeof fontColor !== 'string') {
            fontColor = fontColor[index] || this.chart.config.options.color;
        }
        return fontColor;
    };
    ChartLabel.prototype.getPercentage = function (dataset, element, index) {
        if (this.percentage) {
            return this.percentage;
        }
        var percentage;
        if (this.isChartType(this.chart, 'polarArea') ||
            this.isChartType(this.chart, 'doughnut') ||
            this.isChartType(this.chart, 'pie')) {
            if (!this.total) {
                this.total = 0;
                for (var i = 0; i < dataset.data.length; ++i) {
                    this.total += dataset.data[i];
                }
            }
            percentage = (dataset.data[index] / this.total) * 100;
        }
        else if (this.isChartType(this.chart, 'bar')) {
            if (!this.barTotal[index]) {
                this.barTotal[index] = 0;
                for (var i = 0; i < this.chart.data.datasets.length; ++i) {
                    this.barTotal[index] += this.chart.data.datasets[i].data[index];
                }
            }
            percentage = (dataset.data[index] / this.barTotal[index]) * 100;
        }
        else {
            var circumference = this.chart.config.options.circumference;
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
    };
    ChartLabel.prototype.getRenderInfo = function (element, label) {
        if (this.isChartType(this.chart, 'bar')) {
            return this.getBarRenderInfo(element, label);
        }
        else {
            return this.options.arc
                ? this.getArcRenderInfo(element, label)
                : this.getBaseRenderInfo(element, label);
        }
    };
    ChartLabel.prototype.getBaseRenderInfo = function (element, label) {
        if (this.options.position === LabelPosition.OUTSIDE ||
            this.options.position === LabelPosition.BORDER) {
            var renderInfo = {};
            var rangeFromCentre = void 0;
            var view = element;
            var centreAngle = view.startAngle + (view.endAngle - view.startAngle) / 2;
            var innerRadius = view.outerRadius / 2;
            if (this.options.position === LabelPosition.BORDER) {
                rangeFromCentre = (view.outerRadius - innerRadius) / 2 + innerRadius;
            }
            else if (this.options.position === LabelPosition.OUTSIDE) {
                rangeFromCentre =
                    view.outerRadius -
                        innerRadius +
                        innerRadius +
                        this.options.textMargin;
            }
            renderInfo = {
                x: view.x + Math.cos(centreAngle) * rangeFromCentre,
                y: view.y + Math.sin(centreAngle) * rangeFromCentre
            };
            if (this.options.position === LabelPosition.OUTSIDE) {
                var offset = this.options.textMargin + this.measureLabel(label).width / 2;
                renderInfo.x += renderInfo.x < view.x ? -offset : offset;
            }
            return renderInfo;
        }
        else {
            return element.tooltipPosition();
        }
    };
    ChartLabel.prototype.getArcRenderInfo = function (element, label) {
        var radius;
        var view = element;
        if (this.options.position === LabelPosition.OUTSIDE) {
            radius =
                view.outerRadius + this.options.fontSize + this.options.textMargin;
        }
        else if (this.options.position === LabelPosition.BORDER) {
            radius = (view.outerRadius / 2 + view.outerRadius) / 2;
        }
        else {
            radius = (view.innerRadius + view.outerRadius) / 2;
        }
        var startAngle = view.startAngle, endAngle = view.endAngle;
        var totalAngle = endAngle - startAngle;
        startAngle += Math.PI / 2;
        endAngle += Math.PI / 2;
        var metrics = this.measureLabel(label);
        startAngle += (endAngle - (metrics.width / radius + startAngle)) / 2;
        return { radius: radius, startAngle: startAngle, endAngle: endAngle, totalAngle: totalAngle, view: view };
    };
    ChartLabel.prototype.getBarRenderInfo = function (element, label) {
        var renderInfo = element.tooltipPosition();
        renderInfo.y -=
            this.measureLabel(label).height / 2 + this.options.textMargin;
        return renderInfo;
    };
    ChartLabel.prototype.outsideInRange = function (left, right, top, bottom) {
        var labelBounds = this.labelBounds;
        for (var i = 0; i < labelBounds.length; ++i) {
            var bound = labelBounds[i];
            var potins = [
                [left, top],
                [left, bottom],
                [right, top],
                [right, bottom],
            ];
            for (var j = 0; j < potins.length; ++j) {
                var x = potins[j][0];
                var y = potins[j][1];
                if (x >= bound.left &&
                    x <= bound.right &&
                    y >= bound.top &&
                    y <= bound.bottom) {
                    return false;
                }
            }
            potins = [
                [bound.left, bound.top],
                [bound.left, bound.bottom],
                [bound.right, bound.top],
                [bound.right, bound.bottom],
            ];
            for (var j = 0; j < potins.length; ++j) {
                var x = potins[j][0];
                var y = potins[j][1];
                if (x >= left && x <= right && y >= top && y <= bottom) {
                    return false;
                }
            }
        }
        labelBounds.push({ left: left, right: right, top: top, bottom: bottom });
        return true;
    };
    ChartLabel.prototype.drawable = function (element, label, renderInfo) {
        if (this.options.overlap) {
            return true;
        }
        if (this.options.arc) {
            return (renderInfo.endAngle - renderInfo.startAngle <= renderInfo.totalAngle);
        }
        var metrics = this.measureLabel(label);
        var left = renderInfo.x - metrics.width / 2;
        var right = renderInfo.x + metrics.width / 2;
        var top = renderInfo.y - metrics.height / 2;
        var bottom = renderInfo.y + metrics.height / 2;
        if (this.options.position === LabelPosition.OUTSIDE) {
            return this.outsideInRange(left, right, top, bottom);
        }
        return (element.inRange(left, top) &&
            element.inRange(left, bottom) &&
            element.inRange(right, top) &&
            element.inRange(right, bottom));
    };
    ChartLabel.prototype.measureLabel = function (label) {
        var _this = this;
        if (typeof label === 'object') {
            return { width: label.width, height: label.height };
        }
        var lines = label.split(EMPTY_LINE_SEPARATOR);
        var width = lines.reduce(function (acc, item) {
            var result = _this.ctx.measureText(item);
            return result.width > acc ? result.width : acc;
        }, 0);
        var height = this.options.fontSize * lines.length;
        return { width: width, height: height };
    };
    ChartLabel.prototype.loadImage = function (imgObject) {
        var image = new Image();
        image.src = imgObject.src;
        image.width = imgObject.width;
        image.height = imgObject.height;
        return image;
    };
    ChartLabel.prototype.isChartType = function (chart, type) {
        var config = chart === null || chart === void 0 ? void 0 : chart.config;
        return (config === null || config === void 0 ? void 0 : config.type) === type;
    };
    return ChartLabel;
}());
export { ChartLabel };
//# sourceMappingURL=chart-label.js.map