export interface RecordsList <T> {
  rows: T[];
  count: number;
}

// createHttpParams skips null/undefined/'' values, so queries may carry them
export interface Query {
  [key: string] : string | number | boolean | null | undefined;
}

export interface Selector {
  id: string;
  name: string;
}

// limit/offset/count are always initialized (see PaginationService.getDefaultPagination)
export interface PaginationSetting {
  offset: number;
  limit: number;
  count: number;
  searchText?: string | null;
  showInputSearch?: boolean;
}

export interface ChartData {
  series: Series[];
}

export interface Series {
  name: string;
  data: DataPoint[];
}

export interface DataPoint {
  x: string;
  y: number;
  extraLabel?: number;
  colorPalette?: string | null;
}
