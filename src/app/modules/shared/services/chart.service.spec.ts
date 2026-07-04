import { ChartService, CHART_CATEGORY_COLORS } from './chart.service';

describe('ChartService', () => {
  let service: ChartService;

  beforeEach(() => {
    service = new ChartService();
  });

  describe('mapGraphicData', () => {
    it('should throw for an unsupported chart type', () => {
      expect(() => service.mapGraphicData('donut', {})).toThrow('Unsupported chart type: donut');
    });

    it('should merge the caller graphics over the defaults (shallow)', () => {
      const result = service.mapGraphicData('pie', {
        series: [10, 20],
        labels: ['Comida', 'Hogar'],
        legend: { show: true }
      });

      expect(result.chart.type).toBe('pie');
      expect(result.series).toEqual([10, 20]);
      expect(result.labels).toEqual(['Comida', 'Hogar']);
      expect(result.legend).toEqual({ show: true });
    });

    it('should not leak overrides into later mappings', () => {
      service.mapGraphicData('pie', { legend: { show: true } });

      expect(service.mapGraphicData('pie', {}).legend).toEqual({ show: false });
    });
  });

  describe('mapPieChartGraphicData', () => {
    it('should produce a pie config with the legend hidden by default', () => {
      const result = service.mapPieChartGraphicData({ series: [1] });

      expect(result.chart.type).toBe('pie');
      expect(result.legend.show).toBe(false);
      expect(result.tooltip.enabled).toBe(true);
    });

    it('should render the color, label and formatted amount in the custom tooltip', () => {
      const result = service.mapPieChartGraphicData({});

      const html = result.tooltip.custom({
        seriesIndex: 1,
        w: {
          config: {
            colors: ['#111111', '#222222'],
            labels: ['Comida', 'Hogar'],
            series: [10, 1234.5]
          }
        }
      });

      expect(html).toContain('background-color: #222222');
      expect(html).toContain('Hogar:');
      expect(html).toContain('$ 1,234.50');
    });
  });

  describe('mapBarChartGraphicData', () => {
    it('should produce a horizontal distributed bar config with the category palette', () => {
      const result = service.mapBarChartGraphicData({});

      expect(result.chart.type).toBe('bar');
      expect(result.colors).toEqual(CHART_CATEGORY_COLORS);
      expect(result.plotOptions.bar.horizontal).toBe(true);
      expect(result.plotOptions.bar.distributed).toBe(true);
      expect(result.legend.show).toBe(false);
      expect(result.dataLabels.enabled).toBe(false);
    });

    it('should prefer extraLabel over y in the custom tooltip', () => {
      const result = service.mapBarChartGraphicData({});
      const w = {
        config: {
          series: [{
            data: [
              { x: 'Súper', y: 10 },
              { x: 'Hogar', y: 100, extraLabel: 250 }
            ]
          }]
        }
      };

      const html = result.tooltip.custom({ seriesIndex: 0, dataPointIndex: 1, w });

      expect(html).toContain('Hogar');
      expect(html).toContain('$ 250.00');
      expect(html).not.toContain('$ 100.00');
    });

    it('should fall back to the y value when there is no extraLabel', () => {
      const result = service.mapBarChartGraphicData({});
      const w = {
        config: {
          series: [{ data: [{ x: 'Súper', y: 10 }] }]
        }
      };

      const html = result.tooltip.custom({ seriesIndex: 0, dataPointIndex: 0, w });

      expect(html).toContain('Súper');
      expect(html).toContain('$ 10.00');
    });
  });

  describe('mapLineChartGraphicData', () => {
    it('should produce a line config with the legend visible', () => {
      const result = service.mapLineChartGraphicData({ series: [{ name: 'Gastos', data: [] }] });

      expect(result.chart.type).toBe('line');
      expect(result.legend.show).toBe(true);
      expect(result.series).toEqual([{ name: 'Gastos', data: [] }]);
    });
  });

  describe('mapAreaChartGraphicData', () => {
    it('should produce a sparkline area config', () => {
      const result = service.mapAreaChartGraphicData({});

      expect(result.chart.type).toBe('area');
      expect(result.chart.sparkline.enabled).toBe(true);
      expect(result.xaxis.type).toBe('datetime');
    });

    it('should format the y axis tooltip values as currency', () => {
      const result = service.mapAreaChartGraphicData({});

      expect(result.tooltip.y.formatter(99)).toBe('$ 99.00');
      expect(result.tooltip.y.formatter(1500.755)).toBe('$ 1,500.76');
    });
  });

  describe('convertIntoCurrency', () => {
    it('should format with a dollar prefix, thousands separators and two decimals', () => {
      expect(service.convertIntoCurrency(1234.5)).toBe('$ 1,234.50');
      expect(service.convertIntoCurrency(1000000)).toBe('$ 1,000,000.00');
    });

    it('should format zero and sub-peso amounts', () => {
      expect(service.convertIntoCurrency(0)).toBe('$ 0.00');
      expect(service.convertIntoCurrency(0.5)).toBe('$ 0.50');
    });

    it('should keep the sign for negative amounts', () => {
      expect(service.convertIntoCurrency(-45.5)).toBe('$ -45.50');
    });
  });
});
