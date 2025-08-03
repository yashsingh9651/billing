import { apiSlice } from './apiSlice';

export interface DashboardStats {
  totalProducts: number;
  totalInvoices: number;
  lowStockItems: number;
  totalAmountReceived: number;
  totalAmountSpent: number;
  
  // Percentage changes
  salesChange: number;
  salesChangeType: 'increase' | 'decrease';
  spentChange: number;
  spentChangeType: 'increase' | 'decrease';
  invoicesChange: number;
  invoicesChangeType: 'increase' | 'decrease';
  productsChange: number;
  productsChangeType: 'increase' | 'decrease';
  lowStockChange: number;
  lowStockChangeType: 'increase' | 'decrease';
  
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    amount: number;
    invoiceType: 'BUYING' | 'SELLING';
    partyName: string;
  }>;
}

export const dashboardApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/dashboard',
      providesTags: ['Invoices', 'Products'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
} = dashboardApiSlice;
