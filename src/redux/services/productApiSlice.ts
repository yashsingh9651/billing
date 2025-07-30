import { apiSlice } from './apiSlice';

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  _count?: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

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
  category: string;
  categoryId?: string;
  productCategory?: ProductCategory;
  barcode?: string;
  supplier: string;
  taxRate: number;
  description?: string;
  isActive: boolean;
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
  category: string;
  categoryId?: string;
  barcode?: string;
  supplier: string;
  taxRate: number;
  description?: string;
  isActive?: boolean;
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

export interface CategoryResponse {
  categories: ProductCategory[];
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
}

export interface CategoryUpdateInput extends CategoryCreateInput {
  id: string;
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

    // Category endpoints
    getCategories: builder.query<CategoryResponse, void>({
      query: () => '/products/categories',
      providesTags: ['Categories'],
    }),
    
    getCategoryById: builder.query<{ category: ProductCategory }, string>({
      query: (id) => `/products/categories/${id}`,
      providesTags: (result, error, id) => [{ type: 'Categories', id }],
    }),
    
    createCategory: builder.mutation<{ category: ProductCategory }, CategoryCreateInput>({
      query: (category) => ({
        url: '/products/categories',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['Categories'],
    }),
    
    updateCategory: builder.mutation<{ category: ProductCategory }, CategoryUpdateInput>({
      query: ({ id, ...category }) => ({
        url: `/products/categories/${id}`,
        method: 'PUT',
        body: category,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Categories', id }, 'Categories'],
    }),
    
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Categories'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = productApiSlice;
