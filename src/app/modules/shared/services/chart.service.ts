import { Injectable } from '@angular/core';
import { DataPoint } from '@app/modules/shared/interfaces/shared.model';

export const CHART_CATEGORY_COLORS = [
  '#2A4C3C', '#3A7D6E', '#7C9A5C', '#C9A84C', '#B27040',
  '#5B809A', '#9A6880', '#7A6A52', '#4A9A86', '#9AAA6C',
  '#A08858', '#8A5A4A', '#6A90A4', '#8A8A6A', '#6A7A5A', '#AA8A6A',
];

@Injectable({
  providedIn: 'root',
})
export class ChartService {
  private defaultSettings = {
    pie: {
      chart: { type: 'pie' },
      legend: { show: false },
      tooltip: {
        enabled: true,
        fillSeriesColor: false,
        theme: 'dark',
        custom: ({
          seriesIndex,
          w,
          }: { seriesIndex: number; w: { config: { colors: string[]; labels: string[]; series: number[] } } }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
          <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
          <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
          <div class="ml-2 text-md font-bold leading-none">${this.convertIntoCurrency(w.config.series[seriesIndex])}</div>
      </div>`,
      },
    },
    bar: {
      chart: {
        type: 'bar',
        height: '100%',
        toolbar: {
          show: false,
          tools: {
            download: false
          }
        }
      },
      colors: CHART_CATEGORY_COLORS,
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '90%',
          distributed: true,
        }
      },
      legend: { show: false },
      yaxis: {
        labels: { show: false }
      },
      grid: {
        show       : true,
        borderColor: 'rgba(0, 0, 0, 0.06)',
        padding    : {
          top   : 0,
          bottom: -40,
          left  : 0,
          right : 0,
        },
        position   : 'back',
        xaxis: {
          lines: { show: true },
          labels: { },
        },
        yaxis: {
          lines: { show: false },
        }
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        theme       : 'dark',
        enabledOnSeries: [0],
        custom: ({ seriesIndex, dataPointIndex, w }: { seriesIndex: number; dataPointIndex: number; w: { config: { series: { data: DataPoint[] }[] } } }): string => {
          const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
          const displayValue = dataPoint.extraLabel !== undefined ? dataPoint.extraLabel : dataPoint.y;
          const categoryName = dataPoint.x;

          return `<div class="apexcharts-tooltip-custom">
            <div style="padding: 8px 12px; background: #1A1A2E; border-radius: 4px; color: white;">
              <div style="font-weight: 600; margin-bottom: 4px;">${categoryName}</div>
              <div style="color: #0D9488;">${this.convertIntoCurrency(displayValue)}</div>
            </div>
          </div>`;
        },
      }
    },
    line: {
      chart: { type: 'line' },
      legend: { show: true },
    },
    area: {
      chart  : {
        animations: {
          speed           : 400,
          animateGradually: {
            enabled: false,
          },
        },
        fontFamily: 'inherit',
        foreColor : 'inherit',
        width     : '100%',
        height    : '100%',
        type      : 'area',
        sparkline : {
          enabled: true,
        },
      },
      colors : ['#2A4C3C', '#3A7D6E'],
      fill   : {
        colors : ['rgba(42, 76, 60, 0.3)', 'rgba(58, 125, 110, 0.3)'],
        opacity: 0.5,
        type   : 'solid',
      },
      stroke : {
        curve: 'straight',
        width: 2,
      },
      tooltip: {
        followCursor: true,
        theme       : 'dark',
        x           : {
          format: 'MMM dd, yyyy',
        },
        y           : {
          formatter: (value: number): string => this.convertIntoCurrency(value),
        },
      },
      xaxis  : {
        type: 'datetime',
      },
      grid      : {
        show       : true,
        borderColor: 'rgba(0, 0, 0, 0.06)',
        padding    : {
          top   : 10,
          bottom: -40,
          left  : 0,
          right : 0,
        },
        position   : 'back',
        xaxis      : {
          lines: {
            show: true,
          },
        },
      },
    }
  };

  mapGraphicData(chartType: string, graphics: any): any {
    if (!this.isSupportedChartType(chartType)) {
      throw new Error(`Unsupported chart type: ${chartType}`);
    }
    return {
      ...this.defaultSettings[chartType],
      ...graphics,
    };
  }

  private isSupportedChartType(chartType: string): chartType is keyof ChartService['defaultSettings'] {
    return chartType in this.defaultSettings;
  }

  mapPieChartGraphicData(graphics: any): any {
    // Slice borders read as gaps: stroke with the card surface, resolved at
    // build time (SVG attributes can't consume CSS variables)
    return {
      stroke: { show: true, width: 2, colors: [this.surfaceColor()] },
      ...this.mapGraphicData('pie', graphics),
    };
  }

  private surfaceColor(): string {
    // ApexCharts' color parser only understands hex / comma rgb — convert the
    // "R G B" triplet stored in the CSS variable to hex
    const triplet = typeof document !== 'undefined'
      ? getComputedStyle(document.body).getPropertyValue('--maguey-card').trim()
      : '';
    const parts = triplet.split(/\s+/).map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return '#FFFFFF';
    }
    return '#' + parts.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  mapBarChartGraphicData(graphics: any): any {
    return this.mapGraphicData('bar', graphics);
  }

  mapLineChartGraphicData(graphics: any): any {
    return this.mapGraphicData('line', graphics);
  }

  mapAreaChartGraphicData(graphics: any): any {
    return this.mapGraphicData('area', graphics);
  }

  convertIntoCurrency(value: number): string {
    return '$ ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

}
