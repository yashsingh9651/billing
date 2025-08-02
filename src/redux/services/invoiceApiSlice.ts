import { apiSlice } from './apiSlice';
import { Product } from './productApiSlice';

export type InvoiceType = 'BUYING' | 'SELLING';
export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'CANCELLED';

export interface InvoiceItem {
  id?: string;
  serialNumber: number;
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  discount: number;
  amount: number;
  hsnCode?: string;
  unit?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  type: InvoiceType;
  
  // Sender info
  senderName: string;
  senderAddress: string;
  senderGST?: string;
  senderContact: string;
  senderState?: string;
  senderStateCode?: string;
  senderEmail?: string;
  
  // Receiver info
  receiverName: string;
  receiverAddress: string;
  receiverGST?: string;
  receiverContact: string;
  receiverState?: string;
  
  // Bank details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  authorisedSignatory?: string;
  
  // Invoice metadata
  irn?: string;
  ackNo?: string;
  defaultHsnCode?: string;
  roundOffAmount?: number;
  
  // Tax rates
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  
  // Items and totals
  items: InvoiceItem[];
  subtotal: number;
  
  // Status and metadata
  status: InvoiceStatus;
  notes?: string;
  
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceCreateInput {
  type: InvoiceType;
  date?: string;
  
  // Sender info - only required for BUYING type
  senderName?: string;
  senderAddress?: string;
  senderGST?: string;
  senderContact?: string;
  
  // Receiver info - only required for SELLING type
  receiverName?: string;
  receiverAddress?: string;
  receiverGST?: string;
  receiverContact?: string;
  
  // Items and totals
  items: Omit<InvoiceItem, 'id'>[];
  notes?: string;
  
  // Tax rates (for different types of invoices)
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  
  // Inventory update flag for buying invoices
  updateInventory?: boolean;
}

export interface InvoiceUpdateInput extends Partial<InvoiceCreateInput> {
  id: string;
  status?: InvoiceStatus;
}

export interface InventoryUpdateResult {
  success: boolean;
  message: string;
  results?: Array<{
    productId: string;
    success: boolean;
    oldQuantity?: number;
    newQuantity?: number;
    quantityAdded?: number;
    message?: string;
  }>;
  invoiceId?: string;
  error?: string;
}

export const invoiceApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<Invoice[], void>({
      query: () => '/invoices',
      providesTags: ['Invoices'],
    }),
    
    getInvoiceById: builder.query<Invoice, string>({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoices', id }],
    }),
    
    createInvoice: builder.mutation<Invoice, InvoiceCreateInput>({
      query: (invoice) => ({
        url: '/invoices',
        method: 'POST',
        body: invoice,
      }),
      invalidatesTags: ['Invoices'],
    }),
    
    updateInvoice: builder.mutation<Invoice, InvoiceUpdateInput>({
      query: ({ id, ...invoice }) => ({
        url: `/invoices/${id}`,
        method: 'PUT',
        body: invoice,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Invoices', id }],
    }),
    
    deleteInvoice: builder.mutation<void, string>({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invoices'],
    }),
    
    updateInventory: builder.mutation<InventoryUpdateResult, string>({
      query: (id) => ({
        url: `/invoices/${id}/update-inventory`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Invoices', id },
        'Products'
      ],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useUpdateInventoryMutation
} = invoiceApiSlice;