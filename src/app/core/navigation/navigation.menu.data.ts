import { MagueyNavigationItem } from '@maguey/components/navigation';

export const menu: MagueyNavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    tooltip: 'Dashboard',
    type: 'aside',
    icon: 'heroicons_outline:home',
    children: [
      {
        id: 'dashboard.overview',
        title: 'Resumen',
        type: 'basic',
        icon: 'heroicons_outline:chart-bar-square',
        link: '/dashboard'
      }
    ]
  },
  {
    id: 'expenses',
    title: 'Gastos',
    tooltip: 'Gastos',
    type: 'aside',
    icon: 'heroicons_outline:credit-card',
    children: [
      {
        id: 'expenses.list',
        title: 'Listado',
        type: 'basic',
        icon: 'heroicons_outline:list-bullet',
        link: '/expenses/list'
      },
      {
        id: 'expenses.list',
        title: 'Estado de Cuenta',
        type: 'basic',
        icon: 'heroicons_outline:document-text',
        link: '/expenses/statement'
      },
    ]
  },
  {
    id: 'inventory',
    title: 'Inventario',
    tooltip: 'Inventario',
    type: 'aside',
    icon: 'heroicons_outline:cube',
    children: [
      {
        id: 'inventory.list',
        title: 'Artículos y comercios',
        type: 'basic',
        icon: 'heroicons_outline:cube',
        link: '/inventory/articles'
      },
    ]
  },
  {
    id: 'incomes',
    title: 'Ingresos',
    tooltip: 'Ingresos',
    type: 'aside',
    icon: 'heroicons_outline:currency-dollar',
    children: [
      {
        id: 'incomes.list',
        title: 'Listado',
        type: 'basic',
        icon: 'heroicons_outline:list-bullet',
        link: '/incomes/list'
      }
    ]
  },
  {
    id: 'reports',
    title: 'Reportes',
    tooltip: 'Reportes',
    type: 'aside',
    icon: 'heroicons_outline:chart-bar',
    children: [
      {
        id: 'reports.cash-flow',
        title: 'Flujo de Efectivo',
        type: 'basic',
        icon: 'heroicons_outline:arrow-trending-up',
        link: '/reports/cash-flow'
      }
    ]
  },
  {
    id: 'family',
    title: 'Familia',
    tooltip: 'Familia',
    type: 'aside',
    icon: 'heroicons_outline:users',
    children: [
      {
        id: 'family.spending',
        title: 'Nuestros Gastos',
        type: 'basic',
        icon: 'heroicons_outline:banknotes',
        link: '/family/spending'
      },
      {
        id: 'family.budgets',
        title: 'Presupuestos',
        type: 'basic',
        icon: 'heroicons_outline:chart-pie',
        link: '/family/budgets'
      },
      {
        id: 'family.settings',
        title: 'Mi Hogar',
        type: 'basic',
        icon: 'heroicons_outline:home',
        link: '/family/settings'
      }
    ]
  },
  {
    id: 'admin',
    title: 'Administración',
    tooltip: 'Administración',
    type: 'aside',
    icon: 'heroicons_outline:cog-6-tooth',
    children: [
      {
        id: 'admin.accounts',
        title: 'Cuentas y métodos de pago',
        type: 'basic',
        icon: 'heroicons_outline:building-library',
        link: '/admin/accounts'
      },
      {
        id: 'admin.tags',
        title: 'Etiquetas',
        type: 'basic',
        icon: 'heroicons_outline:tag',
        link: '/admin/tags'
      },
      {
        id: 'admin.categories',
        title: 'Categorías',
        type: 'basic',
        icon: 'heroicons_outline:squares-2x2',
        link: '/admin/categories'
      }
    ]
  },
];
