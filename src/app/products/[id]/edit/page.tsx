"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { productApiSlice } from "@/redux/services/productApiSlice";

// Define the form schema using Zod
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  buyingPrice: z.coerce.number().min(0, "Buying price cannot be negative"),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative"),
  wholesalePrice: z.coerce
    .number()
    .min(0, "Wholesale price cannot be negative"),
  discountPercentage: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot be more than 100%"),
  mrp: z.coerce.number().min(0, "MRP cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  barcode: z.string().optional(),
  hsnCode: z.string().optional(),
});

// Define the type for our form based on Zod schema
type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
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
      name: "",
      quantity: 0,
      buyingPrice: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      discountPercentage: 0,
      mrp: 0,
      unit: "piece",
      barcode: "",
      hsnCode: "",
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
        barcode: product.barcode || "",
        hsnCode: product.hsnCode || "",
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
      console.error("Error updating product:", error);
      alert("Failed to update product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="py-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-sm text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (isProductError || !product) {
    return (
      <div className="py-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Product</h2>
          <p className="text-gray-600 mb-4">
            The product may have been deleted or doesn't exist.
          </p>
          <Link
            href="/products"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-gray-50 min-h-screen">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href={`/products/${productId}`}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Product
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold leading-7 text-gray-900">
            Edit Product
          </h1>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Update the details of the product in your inventory.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white shadow-md rounded-lg overflow-hidden"
        >
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Product Information
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="name"
                  {...register("name")}
                  className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Quantity *
                </label>
                <input
                  type="number"
                  id="quantity"
                  step="1"
                  min="0"
                  {...register("quantity")}
                  className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                  Unit *
                </label>
                <input
                  type="text"
                  id="unit"
                  {...register("unit")}
                  placeholder="e.g., piece, kg, box"
                  className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.unit && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.unit.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                  Barcode/SKU (Optional)
                </label>
                <input
                  type="text"
                  id="barcode"
                  {...register("barcode")}
                  className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="hsnCode" className="block text-sm font-medium text-gray-700">
                  HSN Code (Optional)
                </label>
                <input
                  type="text"
                  id="hsnCode"
                  {...register("hsnCode")}
                  className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

            <div className="mt-8 p-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Pricing Information
              </h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="buyingPrice" className="block text-sm font-medium text-gray-700">
                    Buying Price *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="buyingPrice"
                      {...register("buyingPrice")}
                      className="block w-full rounded-md p-2 border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  {errors.buyingPrice && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.buyingPrice.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="mrp" className="block text-sm font-medium text-gray-700">
                    MRP *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="mrp"
                      {...register("mrp")}
                      className="block w-full rounded-md p-2 border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  {errors.mrp && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.mrp.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700">
                    Selling Price *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="sellingPrice"
                      {...register("sellingPrice")}
                      className="block w-full rounded-md p-2 border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  {errors.sellingPrice && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.sellingPrice.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="wholesalePrice" className="block text-sm font-medium text-gray-700">
                    Wholesale Price *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="wholesalePrice"
                      {...register("wholesalePrice")}
                      className="block w-full rounded-md p-2 border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  {errors.wholesalePrice && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.wholesalePrice.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700">
                    Discount Percentage *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      id="discountPercentage"
                      {...register("discountPercentage")}
                      className="block w-full rounded-md p-2 border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                  {errors.discountPercentage && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.discountPercentage.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6 pb-6 px-6 bg-gray-50 flex items-center justify-end space-x-3">
              <Link
                href={`/products/${productId}`}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
