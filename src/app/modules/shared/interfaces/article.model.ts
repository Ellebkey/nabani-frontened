export interface ItemHistorical {
  name: string;
  value: number;
  business: string;
  discount: boolean;
}

export interface IArticle {
  id: number;
  concept: string;
  isEnabled: boolean;
  // Optional meta (withMeta=true on the list): Revisar Recibo article search
  lastPrice?: number;
  categoryId?: number | null;
  categoryName?: string | null;
  categoryColor?: string | null;
}


export interface ArticleRecord extends IArticle{
  id: number;
  isEnabled: boolean;
}
