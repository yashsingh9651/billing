'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { productApiSlice } from '@/redux/services/productApiSlice';

// Define the form schema using Zod
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  buyingPrice: z.coerce.number().min(0, 'Buying price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
  wholesalePrice: z.coerce.number().min(0, 'Wholesale price cannot be negative'),
  discountPercentage: z.coerce.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot be more than 100%'),
  mrp: z.coerce.number().min(0, 'MRP cannot be negative'),
  unit: z.string().min(1, 'Unit is required'),
  barcode: z.string().optional(),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative'),
  isActive: z.boolean().default(true),
});

// Define the type for our form based on Zod schema
type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const productId = params.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch product data
  const {
    data: product,
    isLoading: isLoadingProduct,
    isError: isProductError,
  } = productApiSlice.useGetProductByIdQuery(productId);
  
  // Update product mutation
  const [updateProduct] = productApiSlice.useUpdateProductMutation();
  
  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      quantity: 0,
      buyingPrice: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      discountPercentage: 0,
      mrp: 0,
      unit: 'piece',
      barcode: '',
      taxRate: 0,
      isActive: true,
    },
  });
  
  // Set form values when product data is loaded
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        quantity: product.quantity,
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        wholesalePrice: product.wholesalePrice,
        discountPercentage: product.discountPercentage,
        mrp: product.mrp,
        unit: product.unit,
        barcode: product.barcode || '',
        taxRate: product.taxRate,
        isActive: product.isActive,
      });
    }
  }, [product, reset]);
  
  // Form submission handler
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      await updateProduct({
        id: productId,
        ...data,
      }).unwrap();
      
      // Navigate back to product detail page on success
      router.push(`/products/${productId}`);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoadingProduct) {
    return (
      <div className="text-center py-10">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2 text-sm text-gray-500">Loading product details...</p>
      </div>
    );
  }
  
  if (isProductError || !product) {
    return (
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-500">Error loading product. The product may have been deleted or doesn't exist.</p>
            <Link href="/products" className="mt-4 text-blue-600 hover:text-blue-800">
              Return to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Link href={`/products/${productId}`} className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Product
          </Link>
        </div>
        
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Edit Product</h3>
              <p className="mt-1 text-sm text-gray-600">
                Update the product information. All fields marked with * are required.
              </p>
            </div>
          </div>
          
          <div className="mt-5 md:col-span-2 md:mt-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="shadow sm:overflow-hidden sm:rounded-md">
                <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                  {/* Product Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Product Name *
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="name"
                        {...register('name')}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Unit */}
                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                      Unit *
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="unit"
                        {...register('unit')}
                        placeholder="e.g., piece, kg, box"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      {errors.unit && (
                        <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Quantity and Supplier */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                        Quantity *
                      </label>
                      <div className="mt-1">
                        <input
                          type="number"
                          step="1"
                          id="quantity"
                          {...register('quantity')}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        {errors.quantity && (
                          <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Barcode */}
                  <div>
                    <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                      Barcode (Optional)
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="barcode"
                        {...register('barcode')}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      {errors.barcode && (
                        <p className="mt-1 text-sm text-red-600">{errors.barcode.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Pricing */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="buyingPrice" className="block text-sm font-medium text-gray-700">
                        Buying Price *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          id="buyingPrice"
                          {...register('buyingPrice')}
                          className="block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        {errors.buyingPrice && (
                          <p className="mt-1 text-sm text-red-600">{errors.buyingPrice.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700">
                        Selling Price *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          step="1"
                          id="sellingPrice"
                          {...register('sellingPrice')}
                          className="block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        {errors.sellingPrice && (
                          <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="wholesalePrice" className="block text-sm font-medium text-gray-700">
                        Wholesale Price *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          step="1"
                          id="wholesalePrice"
                          {...register('wholesalePrice')}
                          className="block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        {errors.wholesalePrice && (
                          <p className="mt-1 text-sm text-red-600">{errors.wholesalePrice.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="mrp" className="block text-sm font-medium text-gray-700">
                        MRP *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          step="1"
                          id="mrp"
                          {...register('mrp')}
                          className="block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        {errors.mrp && (
                          <p className="mt-1 text-sm text-red-600">{errors.mrp.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700">
                        Discount Percentage *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          step="1"
                          id="discountPercentage"
                          {...register('discountPercentage')}
                          className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                        {errors.discountPercentage && (
                          <p className="mt-1 text-sm text-red-600">{errors.discountPercentage.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">
                        Tax Rate *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          step="1"
                          id="taxRate"
                          {...register('taxRate')}
                          className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                        {errors.taxRate && (
                          <p className="mt-1 text-sm text-red-600">{errors.taxRate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Active Status */}
                  <div className="relative flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        id="isActive"
                        type="checkbox"
                        {...register('isActive')}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="isActive" className="font-medium text-gray-700">
                        Active
                      </label>
                      <p className="text-gray-500">Product is available for sale</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                  <Link
                    href={`/products/${productId}`}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-3"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
