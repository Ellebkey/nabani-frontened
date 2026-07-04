import {
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  input,
  output,
  viewChild
} from '@angular/core';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { SankeyData, SankeyNode, NodeClickEvent } from '../../interfaces/cash-flow.model';

interface SankeyNodeData extends SankeyNode {
  index?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  originalValue?: number;
}

interface SankeyLinkData {
  source: number | SankeyNodeData;
  target: number | SankeyNodeData;
  value: number;
  width?: number;
}

const INK = 'rgb(var(--maguey-ink))';
const INK_3 = 'rgb(var(--maguey-ink-3))';
const BRAND = '#2A4C3C';

/**
 * Single-level sankey (source → categories) with the handoff anatomy
 * (flujo-caja.html): 14px rx-4 nodes, ribbons at 32% of the category
 * color, and stacked name + amount labels.
 */
@Component({
  selector: 'app-sankey-chart',
  templateUrl: './sankey-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class SankeyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly data = input<SankeyData | null>(null);
  readonly primaryColor = input<string | null>(null);
  readonly nodeClick = output<NodeClickEvent>();
  readonly chartContainer = viewChild.required<ElementRef<HTMLDivElement>>('chartContainer');

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    this.setupResizeObserver();
    if (this.data()) {
      this.drawChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['primaryColor']) && this.data() && this.chartContainer()) {
      this.drawChart();
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.data()) {
        this.drawChart();
      }
    });
    this.resizeObserver.observe(this.chartContainer().nativeElement);
  }

  private drawChart(): void {
    const data = this.data();
    const chartContainer = this.chartContainer();
    if (!data || !chartContainer) return;

    const container = chartContainer.nativeElement;
    const width = container.clientWidth || 1100;

    const categoryCount = data.nodes.filter(node => node.id !== 'total-expenses').length;
    const height = Math.min(Math.max(360, categoryCount * 40 + 40), 640);

    const margin = { top: 10, right: 290, bottom: 10, left: 150 };

    d3.select(container).selectAll('*').remove();

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerWidth = Math.max(width - margin.left - margin.right, 200);
    const innerHeight = height - margin.top - margin.bottom;

    const nodeMap = new Map<string, number>();
    const nodes: SankeyNodeData[] = data.nodes.map((node, index) => {
      nodeMap.set(node.id, index);
      return { ...node, index, originalValue: node.value };
    });

    const links: SankeyLinkData[] = data.links
      .filter(link => nodeMap.has(link.source) && nodeMap.has(link.target))
      .map(link => ({
        source: nodeMap.get(link.source)!,
        target: nodeMap.get(link.target)!,
        value: link.value,
      }));

    const sankeyLayout = sankey<SankeyNodeData, SankeyLinkData>()
      .nodeWidth(14)
      .nodePadding(categoryCount > 14 ? 8 : 14)
      .extent([[0, 0], [innerWidth, innerHeight]]);

    const graph = sankeyLayout({
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d })),
    });

    // Ribbons: target category color at 32%
    const linkSel = g.append('g')
      .attr('class', 'links')
      .attr('fill', 'none')
      .selectAll('path')
      .data(graph.links)
      .enter()
      .append('path')
      .attr('class', 'sankey-link')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => this.nodeColor(d.target as SankeyNodeData))
      .attr('stroke-opacity', 0.32)
      .attr('stroke-width', (d) => Math.max(1, d.width || 1))
      .style('cursor', 'pointer')
      .on('mouseover', function () {
        d3.select(this).attr('stroke-opacity', 0.45);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke-opacity', 0.32);
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        this.emitNode(d.target as SankeyNodeData);
      });

    linkSel.append('title')
      .text((d) => `${(d.source as SankeyNodeData).label} → ${(d.target as SankeyNodeData).label}\n${this.formatCurrency(d.value)}`);

    const nodeSel = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graph.nodes)
      .enter()
      .append('g')
      .attr('class', 'sankey-node')
      .style('cursor', (d) => (this.isSource(d as SankeyNodeData) ? 'default' : 'pointer'))
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        this.emitNode(d as SankeyNodeData);
      });

    nodeSel.append('rect')
      .attr('x', (d) => d.x0 || 0)
      .attr('y', (d) => d.y0 || 0)
      .attr('height', (d) => Math.max(4, (d.y1 || 0) - (d.y0 || 0)))
      .attr('width', (d) => (d.x1 || 0) - (d.x0 || 0))
      .attr('fill', (d) => this.nodeColor(d as SankeyNodeData))
      .attr('rx', 4)
      .attr('ry', 4);

    nodeSel.append('title')
      .text((d) => `${d.label}\n${this.formatCurrency(d.originalValue ?? d.value)}`);

    // Labels: stacked name + amount (single line when the band is thin)
    nodeSel.each((d, i, groups) => {
      const sel = d3.select(groups[i]);
      const node = d as SankeyNodeData;
      const bandHeight = (d.y1 || 0) - (d.y0 || 0);
      const centerY = ((d.y0 || 0) + (d.y1 || 0)) / 2;
      const isSource = this.isSource(node);
      const x = isSource ? (d.x0 || 0) - 10 : (d.x1 || 0) + 10;
      const anchor = isSource ? 'end' : 'start';
      const amount = this.formatCurrency(node.originalValue ?? node.value);

      if (isSource || bandHeight > 26) {
        sel.append('text')
          .attr('x', x).attr('y', centerY - 1)
          .attr('text-anchor', anchor)
          .attr('font-size', '13px').attr('font-weight', '600')
          .attr('style', `fill: ${INK}`)
          .text(node.label);
        sel.append('text')
          .attr('x', x).attr('y', centerY + 15)
          .attr('text-anchor', anchor)
          .attr('font-size', '11.5px')
          .attr('style', `fill: ${INK_3}; font-variant-numeric: tabular-nums`)
          .text(amount);
      } else {
        const text = sel.append('text')
          .attr('x', x).attr('y', centerY + 4)
          .attr('text-anchor', anchor)
          .attr('font-size', '13px').attr('font-weight', '600')
          .attr('style', `fill: ${INK}`)
          .text(node.label + ' ');
        text.append('tspan')
          .attr('font-size', '11.5px').attr('font-weight', '400')
          .attr('style', `fill: ${INK_3}; font-variant-numeric: tabular-nums`)
          .text(amount);
      }
    });
  }

  private isSource(node: SankeyNodeData): boolean {
    return node.id === 'total-expenses';
  }

  private nodeColor(node: SankeyNodeData): string {
    if (this.isSource(node)) {
      return this.primaryColor() || BRAND;
    }
    return node.color || BRAND;
  }

  private emitNode(node: SankeyNodeData): void {
    if (this.isSource(node)) {
      return;
    }
    this.nodeClick.emit({
      node,
      label: node.label,
      value: node.originalValue ?? node.value,
      type: 'category',
      color: this.nodeColor(node),
    });
  }

  private formatCurrency(value: number): string {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
