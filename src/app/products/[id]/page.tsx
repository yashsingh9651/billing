'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { productApiSlice } from '@/redux/services/productApiSlice';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const productId = params.id;
  
  const { 
    data: product,
    isLoading,
    isError,
    error
  } = productApiSlice.useGetProductByIdQuery(productId);

  const [deleteProduct] = productApiSlice.useDeleteProductMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await deleteProduct(productId).unwrap();
        router.push('/products');
      } catch (error) {
        console.error('Failed to delete the product:', error);
        alert('Failed to delete the product. Please try again.');
        setIsDeleting(false);
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2 text-sm text-gray-500">Loading product details...</p>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-500">Error loading product details.</p>
            <Link href="/products" className="mt-4 text-blue-600 hover:text-blue-800">
              Return to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500">Product not found.</p>
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
        {/* Back button and Actions */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/products" className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Products
          </Link>
          
          <div className="flex space-x-2">
            <Link
              href={`/products/${productId}/edit`}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:bg-red-400"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
        
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-6 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">{product.name}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Product details and information.</p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Product name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{product.name}</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                <dd className={`mt-1 text-sm ${product.quantity <= 5 ? 'text-red-600 font-semibold' : 'text-gray-900'} sm:col-span-2 sm:mt-0`}>
                  {product.quantity} {product.unit}
                  {product.quantity <= 5 && <span className="ml-2 text-red-600">(Low Stock)</span>}
                </dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    product.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{product.supplier}</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Barcode</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{product.barcode || 'N/A'}</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Buying Price</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">${product.buyingPrice.toFixed(2)}</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Selling Price</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">${product.sellingPrice.toFixed(2)}</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Wholesale Price</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">${product.wholesalePrice.toFixed(2)}</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">MRP</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">${product.mrp.toFixed(2)}</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Discount Percentage</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{product.discountPercentage}%</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Tax Rate</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{product.taxRate}%</dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {product.description || 'No description provided.'}
                </dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {new Date(product.createdAt).toLocaleDateString()}
                </dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {new Date(product.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
