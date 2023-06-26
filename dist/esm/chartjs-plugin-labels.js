(function () {
    'use strict';
    if (typeof Chart === 'undefined') {
        console.error('Cannot find Chart object.');
        return;
    }
    var helpers = Chart.helpers;
    if (typeof Object.assign !== 'function') {
        Object.assign = function (target) {
            if (!target) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            var to = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];
                if (nextSource) {
                    for (var nextKey in nextSource) {
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        };
    }
    var SUPPORTED_TYPES = {};
    ['pie', 'doughnut', 'polarArea', 'bar'].forEach(function (t) {
        SUPPORTED_TYPES[t] = true;
    });
    function Label() {
        this.renderToDataset = this.renderToDataset.bind(this);
    }
    Label.prototype.setup = function (chart, options) {
        this.chart = chart;
        this.ctx = chart.ctx;
        this.args = {};
        this.barTotal = {};
        var chartOptions = chart.config.options;
        this.options = Object.assign({
            position: 'default',
            precision: 0,
            fontSize: chartOptions.font ? chartOptions.font.size : 12,
            fontColor: chartOptions.color || '#333333',
            fontStyle: chartOptions.font ? chartOptions.font.style : 'normal',
            fontFamily: chartOptions.font ? chartOptions.font.family : '\'Helvetica Neue\', \'Helvetica\', \'Arial\', sans-serif',
            shadowOffsetX: 3,
            shadowOffsetY: 3,
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 6,
            images: [],
            outsidePadding: 2,
            textMargin: 2,
            overlap: true
        }, options);
        if (chart.config.type === 'bar') {
            this.options.position = 'default';
            this.options.arc = false;
            this.options.overlap = true;
        }
    };
    Label.prototype.render = function () {
        this.labelBounds = [];
        this.chart.data.datasets.forEach(this.renderToDataset);
    };
    Label.prototype.renderToDataset = function (dataset, index) {
        this.totalPercentage = 0;
        this.total = null;
        var arg = this.args[index];
        arg.meta.data.forEach(function (element, index) {
            this.renderToElement(dataset, arg, element, index);
        }.bind(this));
    };
    Label.prototype.renderToElement = function (dataset, arg, element, index) {
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
        ctx.font = helpers.fontString(this.options.fontSize, this.options.fontStyle, this.options.fontFamily);
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
    Label.prototype.renderLabel = function (label, renderInfo) {
        return this.options.arc ? this.renderArcLabel(label, renderInfo) : this.renderBaseLabel(label, renderInfo);
    };
    Label.prototype.renderBaseLabel = function (label, position) {
        var ctx = this.ctx;
        if (typeof label === 'object') {
            ctx.drawImage(label, position.x - label.width / 2, position.y - label.height / 2, label.width, label.height);
        }
        else {
            ctx.save();
            ctx.textBaseline = 'top';
            ctx.textAlign = 'center';
            if (this.options.textShadow) {
                ctx.shadowOffsetX = this.options.shadowOffsetX;
                ctx.shadowOffsetY = this.options.shadowOffsetY;
                ctx.shadowColor = this.options.shadowColor;
                ctx.shadowBlur = this.options.shadowBlur;
            }
            var lines = label.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var y = position.y - this.options.fontSize / 2 * lines.length + this.options.fontSize * i;
                ctx.fillText(lines[i], position.x, y);
            }
            ctx.restore();
        }
    };
    Label.prototype.renderArcLabel = function (label, renderInfo) {
        var ctx = this.ctx, radius = renderInfo.radius, view = renderInfo.view;
        ctx.save();
        ctx.translate(view.x, view.y);
        if (typeof label === 'string') {
            ctx.rotate(renderInfo.startAngle);
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            var lines = label.split('\n');
            var max = 0;
            var widths = [];
            var offset = 0;
            if (this.options.position === 'border') {
                offset = (lines.length - 1) * this.options.fontSize / 2;
            }
            var mertrics = void 0;
            for (var j = 0; j < lines.length; ++j) {
                mertrics = ctx.measureText(lines[j]);
                if (mertrics.width > max) {
                    max = mertrics.width;
                }
                widths.push(mertrics.width);
            }
            for (var j = 0; j < lines.length; ++j) {
                var line = lines[j];
                var y = (lines.length - 1 - j) * -this.options.fontSize + offset;
                ctx.save();
                var padding = (max - widths[j]) / 2;
                ctx.rotate(padding / radius);
                for (var i = 0; i < line.length; i++) {
                    var char = line.charAt(i);
                    mertrics = ctx.measureText(char);
                    ctx.save();
                    ctx.translate(0, -1 * radius);
                    ctx.fillText(char, 0, y);
                    ctx.restore();
                    ctx.rotate(mertrics.width / radius);
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
    Label.prototype.shouldRenderToElement = function (meta, element) {
        return !meta.hidden && (this.options.showZero ||
            this.chart.config.type === 'polarArea' ? element.outerRadius !== 0 : element.circumference !== 0);
    };
    Label.prototype.getLabel = function (dataset, element, index) {
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
                    label = this.options.images[index] ? this.loadImage(this.options.images[index]) : '';
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
    Label.prototype.getFontColor = function (dataset, element, index) {
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
    Label.prototype.getPercentage = function (dataset, element, index) {
        if (this.percentage) {
            return this.percentage;
        }
        var percentage;
        if (this.chart.config.type === 'polarArea' || this.chart.config.type === 'doughnut' || this.chart.config.type === 'pie') {
            if (!this.total) {
                this.total = 0;
                for (var i = 0; i < dataset.data.length; ++i) {
                    this.total += dataset.data[i];
                }
            }
            percentage = dataset.data[index] / this.total * 100;
        }
        else if (this.chart.config.type === 'bar') {
            if (!this.barTotal[index]) {
                this.barTotal[index] = 0;
                for (var i = 0; i < this.chart.data.datasets.length; ++i) {
                    this.barTotal[index] += this.chart.data.datasets[i].data[index];
                }
            }
            percentage = dataset.data[index] / this.barTotal[index] * 100;
        }
        else {
            percentage = element.circumference / this.chart.config.options.circumference * 100;
        }
        percentage = parseFloat(percentage.toFixed(this.options.precision));
        if (!this.options.showActualPercentages) {
            if (this.chart.config.type === 'bar') {
                this.totalPercentage = this.barTotalPercentage[index] || 0;
            }
            this.totalPercentage += percentage;
            if (this.totalPercentage > 100) {
                percentage -= this.totalPercentage - 100;
                percentage = parseFloat(percentage.toFixed(this.options.precision));
            }
            if (this.chart.config.type === 'bar') {
                this.barTotalPercentage[index] = this.totalPercentage;
            }
        }
        this.percentage = percentage;
        return percentage;
    };
    Label.prototype.getRenderInfo = function (element, label) {
        if (this.chart.config.type === 'bar') {
            return this.getBarRenderInfo(element, label);
        }
        else {
            return this.options.arc ? this.getArcRenderInfo(element, label) : this.getBaseRenderInfo(element, label);
        }
    };
    Label.prototype.getBaseRenderInfo = function (element, label) {
        if (this.options.position === 'outside' || this.options.position === 'border') {
            var renderInfo = {};
            var rangeFromCentre = void 0;
            var view = element;
            var centreAngle = view.startAngle + (view.endAngle - view.startAngle) / 2;
            var innerRadius = view.outerRadius / 2;
            if (this.options.position === 'border') {
                rangeFromCentre = (view.outerRadius - innerRadius) / 2 + innerRadius;
            }
            else if (this.options.position === 'outside') {
                rangeFromCentre = (view.outerRadius - innerRadius) + innerRadius + this.options.textMargin;
            }
            renderInfo = {
                x: view.x + (Math.cos(centreAngle) * rangeFromCentre),
                y: view.y + (Math.sin(centreAngle) * rangeFromCentre)
            };
            if (this.options.position === 'outside') {
                var offset = this.options.textMargin + this.measureLabel(label).width / 2;
                renderInfo.x += renderInfo.x < view.x ? -offset : offset;
            }
            return renderInfo;
        }
        else {
            return element.tooltipPosition();
        }
    };
    Label.prototype.getArcRenderInfo = function (element, label) {
        var radius;
        var view = element;
        if (this.options.position === 'outside') {
            radius = view.outerRadius + this.options.fontSize + this.options.textMargin;
        }
        else if (this.options.position === 'border') {
            radius = (view.outerRadius / 2 + view.outerRadius) / 2;
        }
        else {
            radius = (view.innerRadius + view.outerRadius) / 2;
        }
        var startAngle = view.startAngle, endAngle = view.endAngle;
        var totalAngle = endAngle - startAngle;
        startAngle += Math.PI / 2;
        endAngle += Math.PI / 2;
        var mertrics = this.measureLabel(label);
        startAngle += (endAngle - (mertrics.width / radius + startAngle)) / 2;
        return { radius: radius, startAngle: startAngle, endAngle: endAngle, totalAngle: totalAngle, view: view };
    };
    Label.prototype.getBarRenderInfo = function (element, label) {
        var renderInfo = element.tooltipPosition();
        renderInfo.y -= this.measureLabel(label).height / 2 + this.options.textMargin;
        return renderInfo;
    };
    Label.prototype.drawable = function (element, label, renderInfo) {
        if (this.options.overlap) {
            return true;
        }
        else if (this.options.arc) {
            return renderInfo.endAngle - renderInfo.startAngle <= renderInfo.totalAngle;
        }
        else {
            var mertrics = this.measureLabel(label), left = renderInfo.x - mertrics.width / 2, right = renderInfo.x + mertrics.width / 2, top_1 = renderInfo.y - mertrics.height / 2, bottom = renderInfo.y + mertrics.height / 2;
            if (this.options.position === 'outside') {
                return this.outsideInRange(left, right, top_1, bottom);
            }
            else {
                return element.inRange(left, top_1) && element.inRange(left, bottom) &&
                    element.inRange(right, top_1) && element.inRange(right, bottom);
            }
        }
    };
    Label.prototype.outsideInRange = function (left, right, top, bottom) {
        var labelBounds = this.labelBounds;
        for (var i = 0; i < labelBounds.length; ++i) {
            var bound = labelBounds[i];
            var potins = [
                [left, top],
                [left, bottom],
                [right, top],
                [right, bottom]
            ];
            for (var j = 0; j < potins.length; ++j) {
                var x = potins[j][0];
                var y = potins[j][1];
                if (x >= bound.left && x <= bound.right && y >= bound.top && y <= bound.bottom) {
                    return false;
                }
            }
            potins = [
                [bound.left, bound.top],
                [bound.left, bound.bottom],
                [bound.right, bound.top],
                [bound.right, bound.bottom]
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
    Label.prototype.measureLabel = function (label) {
        if (typeof label === 'object') {
            return { width: label.width, height: label.height };
        }
        else {
            var width = 0;
            var lines = label.split('\n');
            for (var i = 0; i < lines.length; ++i) {
                var result = this.ctx.measureText(lines[i]);
                if (result.width > width) {
                    width = result.width;
                }
            }
            var height = this.options.fontSize * lines.length;
            return { width: width, height: height };
        }
    };
    Label.prototype.loadImage = function (obj) {
        var image = new Image();
        image.src = obj.src;
        image.width = obj.width;
        image.height = obj.height;
        return image;
    };
    function isPluginsLabelsDefined(options) {
        var chartConfig = options._context.chart.config._config;
        if (chartConfig.options && chartConfig.options.plugins)
            return !!chartConfig.options.plugins.labels;
        return false;
    }
    Chart.register({
        id: 'labels',
        beforeDatasetsUpdate: function (chart, args, options) {
            if (!SUPPORTED_TYPES[chart.config.type] || !isPluginsLabelsDefined(options)) {
                return;
            }
            if (!options.length) {
                options = [options];
            }
            var count = options.length;
            if (!chart._labels || count !== chart._labels.length) {
                chart._labels = options.map(function () {
                    return new Label();
                });
            }
            var someOutside = false, maxPadding = 0;
            for (var i = 0; i < count; ++i) {
                var label = chart._labels[i];
                label.setup(chart, options[i]);
                if (label.options.position === 'outside') {
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
            if (!SUPPORTED_TYPES[chart.config.type] || !isPluginsLabelsDefined(options)) {
                return;
            }
            (_a = chart._labels) === null || _a === void 0 ? void 0 : _a.forEach(function (label) {
                label.args[args.index] = args;
            });
        },
        beforeDraw: function (chart, args, options) {
            var _a;
            if (!SUPPORTED_TYPES[chart.config.type] || !isPluginsLabelsDefined(options)) {
                return;
            }
            (_a = chart._labels) === null || _a === void 0 ? void 0 : _a.forEach(function (label) {
                label.barTotalPercentage = {};
            });
        },
        afterDatasetsDraw: function (chart, args, options) {
            var _a;
            if (!SUPPORTED_TYPES[chart.config.type] || !isPluginsLabelsDefined(options)) {
                return;
            }
            (_a = chart._labels) === null || _a === void 0 ? void 0 : _a.forEach(function (label) {
                label.render();
            });
        }
    });
})();
//# sourceMappingURL=chartjs-plugin-labels.js.map