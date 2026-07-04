export interface SelectOptions {
  id: string;
  name: string;
}

export interface ISubcategory {
  id: number;
  name: string;
  categoryId: number;
  enabledTiers: string[];
}

export interface ICategory {
  id: number;
  name: string;
  colorPalette: string | null;
  enabledTiers: string[];
  subcategories: ISubcategory[];
}

/**
 * @deprecated Use ICategory instead
 */
export type Category = ICategory;
