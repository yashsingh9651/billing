'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetCategoryByIdQuery, useUpdateCategoryMutation } from '@/redux/services/productApiSlice';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Form validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoryPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { data, isLoading, error } = useGetCategoryByIdQuery(id);
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  useEffect(() => {
    if (data?.category) {
      reset({
        name: data.category.name,
        description: data.category.description || '',
      });
    }
  }, [data, reset]);

  const onSubmit = async (formData: CategoryFormValues) => {
    try {
      await updateCategory({
        id,
        ...formData,
      }).unwrap();
      setUpdateSuccess(true);
      
      // Reset success message after a delay
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading category details...</div>;
  }

  if (error) {
    return <div className="p-6">Error loading category: {(error as any).data?.error || 'Unknown error'}</div>;
  }

  if (!data?.category) {
    return <div className="p-6">Category not found</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/dashboard/products/categories" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Categories
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Category</h1>
      </div>

      {updateSuccess && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          Category updated successfully!
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isUpdating ? 'Updating...' : 'Update Category'}
            </button>
          </div>
        </form>

        {data.category._count?.products && data.category._count.products > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Products in this Category</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p>This category has {data.category._count.products} associated product(s).</p>
              <Link href={`/dashboard/products?categoryId=${id}`} className="text-blue-600 hover:text-blue-800">
                View products in this category
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
