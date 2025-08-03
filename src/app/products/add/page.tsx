'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateProductMutation } from '@/redux/services/productApiSlice';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => (val === '' ? 0 : Number(val)))
    .refine((val) => !isNaN(val), { message: 'Must be a number' })
    .refine((val) => val >= 0, { message: 'Quantity cannot be negative' }),
  buyingPrice: z
    .union([z.string(), z.number()])
    .transform((val) => (val === '' ? 0 : Number(val)))
    .refine((val) => !isNaN(val), { message: 'Must be a number' })
    .refine((val) => val >= 0, { message: 'Buying price cannot be negative' }),
  sellingPrice: z
    .union([z.string(), z.number()])
    .transform((val) => (val === '' ? 0 : Number(val)))
    .refine((val) => !isNaN(val), { message: 'Must be a number' })
    .refine((val) => val >= 0, { message: 'Selling price cannot be negative' }),
  wholesalePrice: z
    .union([z.string(), z.number()])
    .transform((val) => (val === '' ? 0 : Number(val)))
    .refine((val) => !isNaN(val), { message: 'Must be a number' })
    .refine((val) => val >= 0, { message: 'Wholesale price cannot be negative' }),
  discountPercentage: z
    .union([z.string(), z.number()])
    .transform((val) => (val === '' ? 0 : Number(val)))
    .refine((val) => !isNaN(val), { message: 'Must be a number' })
    .refine((val) => val >= 0, { message: 'Discount cannot be negative' })
    .refine((val) => val <= 100, { message: 'Discount cannot be more than 100%' }),
  mrp: z
    .union([z.string(), z.number()])
    .transform((val) => (val === '' ? 0 : Number(val)))
    .refine((val) => !isNaN(val), { message: 'Must be a number' })
    .refine((val) => val >= 0, { message: 'MRP cannot be negative' }),
  unit: z.string().min(1, 'Unit is required'),
  barcode: z.string().optional(),
});

// Use z.infer to get the proper types
type ProductFormData = z.infer<typeof productSchema>;

export default function AddProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createProduct] = useCreateProductMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    mode: 'onBlur',
    shouldUseNativeValidation: false,
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
    },
  });

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    setIsSubmitting(true);
    
    try {
      const result = await createProduct(data).unwrap();
      router.push('/products');
      router.refresh();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('An error occurred while adding the product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold leading-7 text-gray-900">Add New Product</h1>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Fill in the details to add a new product to your inventory.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 divide-y divide-gray-200">
        <div className="space-y-8 divide-y divide-gray-200">
          <div className="pt-8">
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">Product Information</h3>
              <p className="mt-1 text-sm text-gray-500">Basic details about the product.</p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                  Product Name
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="quantity" className="block text-sm font-medium leading-6 text-gray-900">
                  Quantity
                </label>
                <div className="mt-2">
                  <input
                    type="number"
                    id="quantity"
                    step="1"
                    {...register('quantity')}
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                  {errors.quantity && (
                    <p className="mt-2 text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="unit" className="block text-sm font-medium leading-6 text-gray-900">
                  Unit
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="unit"
                    {...register('unit')}
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="e.g., piece, kg, box"
                  />
                  {errors.unit && (
                    <p className="mt-2 text-sm text-red-600">{errors.unit.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="barcode" className="block text-sm font-medium leading-6 text-gray-900">
                  Barcode/SKU (Optional)
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="barcode"
                    {...register('barcode')}
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                  {errors.barcode && (
                    <p className="mt-2 text-sm text-red-600">{errors.barcode.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">Pricing Information</h3>
              <p className="mt-1 text-sm text-gray-500">Pricing details for the product.</p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="buyingPrice" className="block text-sm font-medium leading-6 text-gray-900">
                  Buying Price
                </label>
                <div className="mt-2">
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      id="buyingPrice"
                      step="1"
                      {...register('buyingPrice')}
                      className="block w-full rounded-md border-0 py-1.5 pl-7 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  {errors.buyingPrice && (
                    <p className="mt-2 text-sm text-red-600">{errors.buyingPrice.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="sellingPrice" className="block text-sm font-medium leading-6 text-gray-900">
                  Selling Price
                </label>
                <div className="mt-2">
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      id="sellingPrice"
                      step="1"
                      {...register('sellingPrice')}
                      className="block w-full rounded-md border-0 py-1.5 pl-7 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  {errors.sellingPrice && (
                    <p className="mt-2 text-sm text-red-600">{errors.sellingPrice.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="wholesalePrice" className="block text-sm font-medium leading-6 text-gray-900">
                  Wholesale Price
                </label>
                <div className="mt-2">
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      id="wholesalePrice"
                      step="1"
                      {...register('wholesalePrice')}
                      className="block w-full rounded-md border-0 py-1.5 pl-7 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  {errors.wholesalePrice && (
                    <p className="mt-2 text-sm text-red-600">{errors.wholesalePrice.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="mrp" className="block text-sm font-medium leading-6 text-gray-900">
                  MRP
                </label>
                <div className="mt-2">
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      id="mrp"
                      step="1"
                      {...register('mrp')}
                      className="block w-full rounded-md border-0 py-1.5 pl-7 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  {errors.mrp && (
                    <p className="mt-2 text-sm text-red-600">{errors.mrp.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="discountPercentage" className="block text-sm font-medium leading-6 text-gray-900">
                  Discount (%)
                </label>
                <div className="mt-2">
                  <input
                    type="number"
                    id="discountPercentage"
                    min="0"
                    max="100"
                    step="1"
                    {...register('discountPercentage')}
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                  {errors.discountPercentage && (
                    <p className="mt-2 text-sm text-red-600">{errors.discountPercentage.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-6">
                {/* Active checkbox removed */}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
