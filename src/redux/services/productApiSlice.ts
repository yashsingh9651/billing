import { apiSlice } from './apiSlice';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  discountPercentage: number;
  mrp: number;
  unit: string;
  barcode?: string;
  supplier?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateInput {
  name: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  discountPercentage: number;
  mrp: number;
  unit: string;
  barcode?: string;
  supplier?: string;
  description?: string;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  id: string;
}

export interface ProductResponse {
  products: Product[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductResponse, void>({
      query: () => '/products',
      providesTags: ['Products'],
    }),
    
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Products', id }],
    }),
    
    createProduct: builder.mutation<Product, ProductCreateInput>({
      query: (product) => ({
        url: '/products',
        method: 'POST',
        body: product,
      }),
      invalidatesTags: ['Products'],
    }),
    
    updateProduct: builder.mutation<Product, ProductUpdateInput>({
      query: ({ id, ...product }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: product,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Products', id }],
    }),
    
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApiSlice;
