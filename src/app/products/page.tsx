'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';

// Import the API hooks from productApiSlice
import { productApiSlice, useDeleteProductMutation } from '@/redux/services/productApiSlice';

interface Product {
  id: string;
  name: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  unit: string;
  barcode?: string;
  mrp: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  const [searchQuery, setSearchQuery] = useState("");
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Delete product mutation
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // Use the RTK Query hook to fetch products
  const { 
    data: productsData, 
    isLoading, 
    isError, 
    error,
    refetch
  } = productApiSlice.useGetProductsQuery();

  // Extract products array from response and handle null case
  const products = productsData?.products || [];

  // Filter products based on search query and low stock
  const filteredProducts = products.filter((product) => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by low stock (quantity <= 5)
    const matchesLowStock = filter !== 'low-stock' || (product.quantity <= 5);
    
    return matchesSearch && matchesLowStock;
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle delete button click
  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteConfirm(true);
  };
  
  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete).unwrap();
        setShowDeleteConfirm(false);
        setProductToDelete(null);
      } catch (error) {
        console.error('Failed to delete product', error);
      }
    }
  };
  
  // Handle cancel delete
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Products</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all products in your inventory including their name, quantity, prices, and status.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/products/add"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <div className="flex items-center">
              <PlusIcon className="h-5 w-5 mr-1" />
              Add product
            </div>
          </Link>
        </div>
      </div>
      
      {/* Filters and Search */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            name="search"
            id="search"
            value={searchQuery}
            onChange={handleSearchChange}
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="Search products"
          />
        </div>
        
        <div className="min-w-[150px]">
          <Link
            href="/products"
            className={`inline-block rounded-md px-3 py-1.5 text-sm font-semibold ${
              !filter ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Products
          </Link>
          <Link
            href="/products?filter=low-stock"
            className={`ml-2 inline-block rounded-md px-3 py-1.5 text-sm font-semibold ${
              filter === 'low-stock' ? 'bg-red-100 text-red-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Low Stock
          </Link>
        </div>
      </div>
      
      {/* Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-2 text-sm text-gray-500">Loading products...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p className="text-red-500">Error loading products. Please try again.</p>
                <button 
                  onClick={() => refetch()}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Retry
                </button>
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Quantity
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        HSN Code
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Buying Price
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Selling Price
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Wholesale Price
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {product.name}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm ${product.quantity <= 5 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {product.quantity} {product.unit}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {product.hsnCode || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">₹ {product.buyingPrice.toFixed(2)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">₹ {product.sellingPrice.toFixed(2)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">₹ {product.wholesalePrice.toFixed(2)}</td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link href={`/products/${product.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                            View
                          </Link>
                          <Link href={`/products/${product.id}/edit`} className="text-blue-600 hover:text-blue-900 mr-4">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No products found.</p>
                <Link href="/products/add" className="mt-2 text-blue-600 hover:text-blue-800 block">
                  Add your first product
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
