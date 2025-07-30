'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useGetProductsQuery } from '@/redux/services/productApiSlice';
import { useCreateInvoiceMutation } from '@/redux/services/invoiceApiSlice';
import { formatCurrency, calculateAmount } from '@/lib/utils';

// Schema for form validation
const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  rate: z.coerce.number().positive('Rate must be greater than 0'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot be more than 100%'),
  amount: z.coerce.number().min(0, 'Amount must be 0 or greater'),
  // New fields for buying invoices
  mrp: z.coerce.number().min(0, 'MRP cannot be negative').optional(),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').optional(),
  wholesalePrice: z.coerce.number().min(0, 'Wholesale price cannot be negative').optional(),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').optional(),
});

const invoiceSchema = z.object({
  type: z.enum(['BUYING', 'SELLING']),
  date: z.string().min(1, 'Date is required'),
  
  // Sender info
  senderName: z.string().min(1, 'Sender name is required'),
  senderAddress: z.string().min(1, 'Sender address is required'),
  senderGST: z.string().optional(),
  senderContact: z.string().min(1, 'Sender contact is required'),
  
  // Receiver info
  receiverName: z.string().min(1, 'Receiver name is required'),
  receiverAddress: z.string().min(1, 'Receiver address is required'),
  receiverGST: z.string().optional(),
  receiverContact: z.string().min(1, 'Receiver contact is required'),
  
  // Items
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  
  // Tax rates (for buying invoices)
  cgstRate: z.coerce.number().min(0, 'CGST rate cannot be negative').max(100, 'CGST rate cannot exceed 100%'),
  sgstRate: z.coerce.number().min(0, 'SGST rate cannot be negative').max(100, 'SGST rate cannot exceed 100%'),
  igstRate: z.coerce.number().min(0, 'IGST rate cannot be negative').max(100, 'IGST rate cannot exceed 100%'),
  
  // Additional fields
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const CreateInvoicePage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: productsData, isLoading: isProductsLoading } = useGetProductsQuery();
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Create firstRender ref at component level
  const firstRender = useRef(true);
  
  // Get business details from user session
  const [businessDetails, setBusinessDetails] = useState({
    name: '',
    address: '',
    gst: '',
    contact: '',
  });

  // Update business details when session loads
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      console.log('user session:', user);
      setBusinessDetails({
        name: user.businessName,
        address: user.businessAddress,
        gst: user.businessGST,
        contact: user.businessContact,
      });
    }
  }, [session]);

  // Initialize form with react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    getValues,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      type: 'BUYING',
      date: new Date().toISOString().split('T')[0],
      senderName: '',
      senderAddress: '',
      senderGST: '',
      senderContact: '',
      receiverName: businessDetails.name,
      receiverAddress: businessDetails.address,
      receiverGST: businessDetails.gst,
      receiverContact: businessDetails.contact,
      items: [
        {
          productId: '',
          productName: '',
          quantity: 1,
          rate: 0,
          discount: 0,
          amount: 0,
          mrp: 0,
          sellingPrice: 0,
          wholesalePrice: 0,
          taxRate: 0
        },
      ],
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      notes: '',
    },
  });

  // Use field array for dynamic invoice items
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchType = watch('type');
  const watchItems = watch('items');
  const watchCgstRate = watch('cgstRate');
  const watchSgstRate = watch('sgstRate');
  const watchIgstRate = watch('igstRate');

  // Auto update sender/receiver based on invoice type
  useEffect(() => {
    if (watchType === 'BUYING') {
      setValue('receiverName', businessDetails.name);
      setValue('receiverAddress', businessDetails.address);
      setValue('receiverGST', businessDetails.gst);
      setValue('receiverContact', businessDetails.contact);
      // Clear sender fields for manual entry
      setValue('senderName', '');
      setValue('senderAddress', '');
      setValue('senderGST', '');
      setValue('senderContact', '');
    } else {
      setValue('senderName', businessDetails.name);
      setValue('senderAddress', businessDetails.address);
      setValue('senderGST', businessDetails.gst);
      setValue('senderContact', businessDetails.contact);
      // Clear receiver fields for manual entry
      setValue('receiverName', '');
      setValue('receiverAddress', '');
      setValue('receiverGST', '');
      setValue('receiverContact', '');
    }
  }, [watchType, businessDetails, setValue]);

  // Effect to recalculate whenever item quantity, rate, or discount changes
  useEffect(() => {
    // For each item in the items array, recalculate its amount
    if (watchItems && watchItems.length > 0) {
      watchItems.forEach((item, index) => {
        const amount = calculateAmount(
          Number(item.quantity) || 0,
          Number(item.rate) || 0,
          Number(item.discount) || 0
        );
        
        // Only update if amount has changed to avoid infinite loop
        if (item.amount !== amount) {
          setValue(`items.${index}.amount`, amount);
        }
      });
    }
  }, [watchItems, setValue]);

  // Calculate amounts whenever items or tax rates change
  useEffect(() => {
    // Calculate subtotal
    const newSubtotal = watchItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    setSubtotal(newSubtotal);
    
    // Calculate tax amounts
    const cgstAmount = (newSubtotal * watchCgstRate) / 100;
    const sgstAmount = (newSubtotal * watchSgstRate) / 100;
    const igstAmount = (newSubtotal * watchIgstRate) / 100;
    const newTaxTotal = cgstAmount + sgstAmount + igstAmount;
    setTaxTotal(newTaxTotal);
    
    // Calculate total
    const newTotal = newSubtotal + newTaxTotal;
    setTotal(newTotal);
  }, [watchItems, watchCgstRate, watchSgstRate, watchIgstRate]);

  // Effect to recalculate item amounts when their quantities or rates change
  useEffect(() => {
    // Create firstRender ref outside of useEffect
    if (!firstRender.current) {
      // For each item in the items array, recalculate its amount
      if (watchItems && watchItems.length > 0) {
        watchItems.forEach((item, index) => {
          if (item.quantity !== undefined && item.rate !== undefined) {
            const amount = calculateAmount(
              Number(item.quantity) || 0,
              Number(item.rate) || 0,
              Number(item.discount) || 0
            );
            
            // Only update if amount has actually changed to avoid loops
            if (Number(item.amount) !== amount) {
              console.log(`Auto-updating amount for item ${index}:`, amount);
              setValue(`items.${index}.amount`, amount);
            }
          }
        });
      }
    } else {
      firstRender.current = false;
    }
  }, [watchItems, setValue]);

  // Handle product selection change
  const handleProductChange = (index: number, productId: string) => {
    if (!productId || !productsData?.products) return;
    
    const product = productsData.products.find(p => p.id === productId);
    if (!product) return;
    
    console.log('Selected product:', product);
    
    // Get current values
    const currentQty = getValues(`items.${index}.quantity`) || 1;
    const rate = watchType === 'BUYING' ? product.buyingPrice : product.sellingPrice;
    const discount = product.discountPercentage || 0;
    
    // Update fields
    setValue(`items.${index}.productName`, product.name);
    setValue(`items.${index}.quantity`, currentQty);
    setValue(`items.${index}.rate`, rate);
    setValue(`items.${index}.discount`, discount);
    
    // Set additional fields for product pricing
    setValue(`items.${index}.mrp`, product.mrp);
    setValue(`items.${index}.sellingPrice`, product.sellingPrice);
    setValue(`items.${index}.wholesalePrice`, product.wholesalePrice);
    setValue(`items.${index}.taxRate`, product.taxRate);
    
    // Calculate and set amount
    const amount = calculateAmount(currentQty, rate, discount);
    setValue(`items.${index}.amount`, amount);
    
    // Get the updated item
    const updatedItem = getValues(`items.${index}`);
    console.log('Updated product data:', updatedItem);
    
    // Manually trigger a recalculation of totals
    const items = getValues('items');
    const newSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    setSubtotal(newSubtotal);
  };

  // Handle quantity or rate change
  const handleItemCalculation = (index: number) => {
    console.log('Recalculating item amount for index:', index);
    
    // Get the latest values directly
    const item = getValues(`items.${index}`);
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discount) || 0;
    
    console.log('Raw item values:', item);
    console.log('Parsed values:', { quantity, rate, discount });
    
    // Calculate the new amount
    const amount = calculateAmount(quantity, rate, discount);
    console.log('Calculated amount:', amount);
    
    // Update the amount in the form
    setValue(`items.${index}.amount`, amount);
    
    // Update the entire item to ensure changes are reflected
    const updatedItem = {
      ...item,
      amount: amount
    };
    setValue(`items.${index}`, updatedItem);
    
    // If this is a product that exists in the database, update the product info if it's a buying invoice
    const productId = getValues(`items.${index}.productId`);
    if (productId && watchType === 'BUYING') {
      // These values will be used when the invoice is submitted to update the product in the database
      const mrp = getValues(`items.${index}.mrp`);
      const sellingPrice = getValues(`items.${index}.sellingPrice`);
      const wholesalePrice = getValues(`items.${index}.wholesalePrice`);
      const taxRate = getValues(`items.${index}.taxRate`);
      
      // Log the updated values for debugging
      console.log(`Product ${productId} pricing updated:`, {
        mrp, sellingPrice, wholesalePrice, taxRate
      });
    }
    
    // Manually trigger a recalculation of totals
    const items = getValues('items');
    const newSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    setSubtotal(newSubtotal);
    
    // Recalculate tax amounts
    const cgstRate = Number(getValues('cgstRate')) || 0;
    const sgstRate = Number(getValues('sgstRate')) || 0;
    const igstRate = Number(getValues('igstRate')) || 0;
    
    const cgstAmount = (newSubtotal * cgstRate) / 100;
    const sgstAmount = (newSubtotal * sgstRate) / 100;
    const igstAmount = (newSubtotal * igstRate) / 100;
    const newTaxTotal = cgstAmount + sgstAmount + igstAmount;
    setTaxTotal(newTaxTotal);
    
    // Update total
    setTotal(newSubtotal + newTaxTotal);
  };

  // Add a new item row
  const addItem = () => {
    append({
      productId: '',
      productName: '',
      quantity: 1,
      rate: 0,
      discount: 0,
      amount: 0,
      mrp: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      taxRate: 0
    });
  };

  // Handle form submission
  const onSubmit: SubmitHandler<InvoiceFormData> = async (data) => {
    setIsSubmitting(true);
    
    try {
      const invoiceData = {
        ...data,
        subtotal: subtotal,
        gstAmount: taxTotal,
        // We'll use these to calculate final amount in the API
        cgstRate: data.cgstRate,
        sgstRate: data.sgstRate,
        igstRate: data.igstRate,
        
        // Add serial numbers to items
        items: data.items.map((item, idx) => ({
          ...item,
          serialNumber: idx + 1,
          // Include the updated product pricing data for buying invoices
          updateProductPricing: watchType === 'BUYING' && item.productId ? {
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            wholesalePrice: item.wholesalePrice,
            taxRate: item.taxRate
          } : undefined
        })),
        
        // Add flag to update inventory for both buying and selling invoices
        // This will be used by the API to automatically update inventory
        updateInventory: true, // Enable for both types of invoices
      };
      
      console.log('Form data:', invoiceData);
      
      // Submit the form
      try {
        const result = await createInvoice(invoiceData).unwrap();
        console.log('Invoice created successfully:', result);
        router.push(`/dashboard/invoices/${result.id}`);
      } catch (error: any) {
        console.error('API Error:', error);
        // Extract detailed error information
        if (error.data) {
          console.error('Error details:', error.data);
        }
        if (error.status) {
          console.error('Error status:', error.status);
        }
        if (error.message) {
          console.error('Error message:', error.message);
        }
        const errorMessage = error.data?.details || error.data?.error || error.message || 'An error occurred while creating the invoice.';
        alert(`Failed to create invoice: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProductsLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold leading-7 text-gray-900">Create New Invoice</h1>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Fill in the details to create a {watchType.toLowerCase()} invoice.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
        {/* Invoice type and date */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="type" className="block text-sm font-medium leading-6 text-gray-900">
              Invoice Type
            </label>
            <div className="mt-2">
              <select
                id="type"
                {...register('type')}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                <option value="BUYING">Buying</option>
                <option value="SELLING">Selling</option>
              </select>
              {errors.type && (
                <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="date" className="block text-sm font-medium leading-6 text-gray-900">
              Date
            </label>
            <div className="mt-2">
              <input
                type="date"
                id="date"
                {...register('date')}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              {errors.date && (
                <p className="mt-2 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sender Information */}
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900">
            {watchType === 'BUYING' ? 'Supplier Information' : 'Your Business Information'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {watchType === 'BUYING' 
              ? 'Enter the supplier details for this purchase.' 
              : 'Your business details will be used as the sender.'}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="senderName" className="block text-sm font-medium leading-6 text-gray-900">
                Business Name
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="senderName"
                  {...register('senderName')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'SELLING'}
                />
                {errors.senderName && (
                  <p className="mt-2 text-sm text-red-600">{errors.senderName.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="senderContact" className="block text-sm font-medium leading-6 text-gray-900">
                Contact
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="senderContact"
                  {...register('senderContact')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'SELLING'}
                />
                {errors.senderContact && (
                  <p className="mt-2 text-sm text-red-600">{errors.senderContact.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="senderAddress" className="block text-sm font-medium leading-6 text-gray-900">
                Address
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="senderAddress"
                  {...register('senderAddress')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'SELLING'}
                />
                {errors.senderAddress && (
                  <p className="mt-2 text-sm text-red-600">{errors.senderAddress.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="senderGST" className="block text-sm font-medium leading-6 text-gray-900">
                GST Number
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="senderGST"
                  {...register('senderGST')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'SELLING'}
                />
                {errors.senderGST && (
                  <p className="mt-2 text-sm text-red-600">{errors.senderGST.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Receiver Information */}
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900">
            {watchType === 'BUYING' ? 'Your Business Information' : 'Customer Information'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {watchType === 'BUYING' 
              ? 'Your business details will be used as the receiver.' 
              : 'Enter the customer details for this sale.'}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="receiverName" className="block text-sm font-medium leading-6 text-gray-900">
                Business Name
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="receiverName"
                  {...register('receiverName')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'BUYING'}
                />
                {errors.receiverName && (
                  <p className="mt-2 text-sm text-red-600">{errors.receiverName.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="receiverContact" className="block text-sm font-medium leading-6 text-gray-900">
                Contact
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="receiverContact"
                  {...register('receiverContact')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'BUYING'}
                />
                {errors.receiverContact && (
                  <p className="mt-2 text-sm text-red-600">{errors.receiverContact.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="receiverAddress" className="block text-sm font-medium leading-6 text-gray-900">
                Address
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="receiverAddress"
                  {...register('receiverAddress')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'BUYING'}
                />
                {errors.receiverAddress && (
                  <p className="mt-2 text-sm text-red-600">{errors.receiverAddress.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="receiverGST" className="block text-sm font-medium leading-6 text-gray-900">
                GST Number
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="receiverGST"
                  {...register('receiverGST')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  readOnly={watchType === 'BUYING'}
                />
                {errors.receiverGST && (
                  <p className="mt-2 text-sm text-red-600">{errors.receiverGST.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900">Invoice Items</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Add one or more items to the invoice.
          </p>

          <div className="mt-4 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        Product
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Quantity
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Rate
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Discount %
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        MRP
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Selling Price
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Wholesale Price
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tax Rate %
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fields.map((field, index) => (
                      <tr key={field.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          <select
                            value={getValues(`items.${index}.productId`) || ""}
                            onChange={(e) => {
                              // Update the productId field directly
                              setValue(`items.${index}.productId`, e.target.value);
                              handleProductChange(index, e.target.value);
                              // Force update after selection
                              setTimeout(() => handleItemCalculation(index), 100);
                            }}
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                          >
                            <option value="">Select a product</option>
                            {productsData?.products?.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                          {getValues(`items.${index}.productName`) && (
                            <p className="mt-1 text-xs text-green-600">
                              Selected: {getValues(`items.${index}.productName`)}
                            </p>
                          )}
                          {errors.items?.[index]?.productId && (
                            <p className="mt-2 text-sm text-red-600">{errors.items[index]?.productId?.message}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.quantity`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setValue(`items.${index}.quantity`, value);
                              handleItemCalculation(index);
                            }}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            min="1"
                            step="1"
                          />
                          {errors.items?.[index]?.quantity && (
                            <p className="mt-2 text-sm text-red-600">{errors.items[index]?.quantity?.message}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.rate`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setValue(`items.${index}.rate`, value);
                              handleItemCalculation(index);
                            }}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            min="0"
                            step="1"
                          />
                          {errors.items?.[index]?.rate && (
                            <p className="mt-2 text-sm text-red-600">{errors.items[index]?.rate?.message}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.discount`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setValue(`items.${index}.discount`, value);
                              handleItemCalculation(index);
                            }}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            min="0"
                            max="100"
                            step="1"
                          />
                          {errors.items?.[index]?.discount && (
                            <p className="mt-2 text-sm text-red-600">{errors.items[index]?.discount?.message}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.amount`)}
                            readOnly
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 bg-gray-100 shadow-sm placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 font-bold"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.mrp`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setValue(`items.${index}.mrp`, value);
                            }}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            min="0"
                            step="1"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.sellingPrice`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setValue(`items.${index}.sellingPrice`, value);
                            }}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            min="0"
                            step="1"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.wholesalePrice`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setValue(`items.${index}.wholesalePrice`, value);
                            }}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            min="0"
                            step="1"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.taxRate`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setValue(`items.${index}.taxRate`, value);
                            }}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            min="0"
                            max="100"
                            step="1"
                          />
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" aria-hidden="true" />
                              <span className="sr-only">Remove item</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={10} className="px-3 py-4 text-center">
                        <button
                          type="button"
                          onClick={addItem}
                          className="inline-flex items-center rounded-md bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-200"
                        >
                          <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" aria-hidden="true" />
                          Add Another Item
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900">Tax Information</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Enter applicable tax rates for this invoice.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label htmlFor="cgstRate" className="block text-sm font-medium leading-6 text-gray-900">
                CGST Rate (%)
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  id="cgstRate"
                  {...register('cgstRate')}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  min="0"
                  max="100"
                  step="1"
                />
                {errors.cgstRate && (
                  <p className="mt-2 text-sm text-red-600">{errors.cgstRate.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="sgstRate" className="block text-sm font-medium leading-6 text-gray-900">
                SGST Rate (%)
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  id="sgstRate"
                  {...register('sgstRate')}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  min="0"
                  max="100"
                  step="1"
                />
                {errors.sgstRate && (
                  <p className="mt-2 text-sm text-red-600">{errors.sgstRate.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="igstRate" className="block text-sm font-medium leading-6 text-gray-900">
                IGST Rate (%)
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  id="igstRate"
                  {...register('igstRate')}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  min="0"
                  max="100"
                  step="1"
                />
                {errors.igstRate && (
                  <p className="mt-2 text-sm text-red-600">{errors.igstRate.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Totals */}
        <div className="border-t border-gray-200 pt-4">
          <dl className="divide-y divide-gray-100">
            <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Subtotal</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {formatCurrency(subtotal)}
              </dd>
            </div>
            <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Tax Amount</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {formatCurrency(taxTotal)}
              </dd>
            </div>
            <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Total Amount</dt>
              <dd className="mt-1 text-sm font-semibold leading-6 text-gray-900 sm:col-span-2 sm:mt-0">
                {formatCurrency(total)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">
            Notes
          </label>
          <div className="mt-2">
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Any additional notes for this invoice"
            />
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
              className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoicePage;
