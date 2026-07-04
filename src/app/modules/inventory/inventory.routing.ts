import { Routes } from '@angular/router';
import { ArticlesListComponent } from './articles/articles-list/articles-list.component';
import { MerchantsListComponent } from './merchants/merchants-list/merchants-list.component';

export const InventoryRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'articles',
        component: ArticlesListComponent,
        data: {
          title: 'Artículos',
        },
      },
      {
        path: 'merchants',
        component: MerchantsListComponent,
        data: {
          title: 'Comercios',
        },
      }
    ],
  },
];
