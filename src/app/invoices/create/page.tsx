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
  productId: z.string().min(0, 'Product is required'),
  productName: z.string().min(0, 'Product name is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be greater than 0'),
  rate: z.coerce.number().min(0,'Rate must be greater than 0'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot be more than 100%'),
  amount: z.coerce.number().min(0, 'Amount must be 0 or greater'),
  hsnCode: z.string().optional(),
  // New fields for buying invoices
  mrp: z.coerce.number().min(0, 'MRP cannot be negative').optional(),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').optional(),
  wholesalePrice: z.coerce.number().min(0, 'Wholesale price cannot be negative').optional(),
});

// Define a single schema that can handle both BUYING and SELLING invoice types
const invoiceSchema = z.object({
  type: z.enum(['BUYING', 'SELLING']),
  date: z.string().min(1, 'Date is required'),
  
  // Sender info - we'll apply conditional validation in the form submission
  senderName: z.string().min(1, 'Sender name is required'),
  senderAddress: z.string().min(1, 'Sender address is required'),
  senderGST: z.string().nullable().optional(),
  senderContact: z.string().min(1, 'Sender contact is required'),
  
  // Receiver info - we'll apply conditional validation in the form submission
  receiverName: z.string().min(1, 'Receiver name is required'),
  receiverAddress: z.string().min(1, 'Receiver address is required'),
  receiverGST: z.string().nullable().optional(),
  receiverContact: z.string().min(1, 'Receiver contact is required'),
  
  // Items
  items: z.array(invoiceItemSchema).min(0, 'At least one item is required'),
  
  // Tax rates
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
  const [formError, setFormError] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [quantityWarnings, setQuantityWarnings] = useState<{[key: number]: string}>({});
  
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
      const user = session.user as {
        businessName?: string;
        businessAddress?: string;
        businessGST?: string;
        businessContact?: string;
      };
      console.log('user session:', user);
      setBusinessDetails({
        name: user.businessName || '',
        address: user.businessAddress || '',
        gst: user.businessGST || '',
        contact: user.businessContact || '',
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
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      type: 'BUYING',
      date: new Date().toISOString().split('T')[0],
      senderName: '',
      senderAddress: '',
      senderGST: '',
      senderContact: '',
      receiverName: businessDetails.name || '',
      receiverAddress: businessDetails.address || '',
      receiverGST: businessDetails.gst || '',
      receiverContact: businessDetails.contact || '',
      items: [],
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
      setValue('receiverName', businessDetails.name || '');
      setValue('receiverAddress', businessDetails.address || '');
      setValue('receiverGST', businessDetails.gst || '');
      setValue('receiverContact', businessDetails.contact || '');
      // Clear sender fields for manual entry
      setValue('senderName', '');
      setValue('senderAddress', '');
      setValue('senderGST', '');
      setValue('senderContact', '');
    } else {
      setValue('senderName', businessDetails.name || '');
      setValue('senderAddress', businessDetails.address || '');
      setValue('senderGST', businessDetails.gst || '');
      setValue('senderContact', businessDetails.contact || '');
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
      watchItems.forEach((item: any, index: number) => {
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
    if (!watchItems || watchItems.length === 0) {
      setSubtotal(0);
      setTaxTotal(0);
      setTotal(0);
      return;
    }
    
    // Calculate subtotal - ensure numeric values
    const newSubtotal = watchItems.reduce((sum: number, item: any) => {
      const itemAmount = parseFloat(item.amount?.toString() || '0');
      return sum + (isNaN(itemAmount) ? 0 : itemAmount);
    }, 0);
    
    setSubtotal(newSubtotal);
    
    // Calculate tax amounts - ensure numeric values
    const cgstAmount = (newSubtotal * parseFloat(watchCgstRate?.toString() || '0')) / 100;
    const sgstAmount = (newSubtotal * parseFloat(watchSgstRate?.toString() || '0')) / 100;
    const igstAmount = (newSubtotal * parseFloat(watchIgstRate?.toString() || '0')) / 100;
    const newTaxTotal = cgstAmount + sgstAmount + igstAmount;
    setTaxTotal(newTaxTotal);
    
    // Calculate total - ensure it's treated as a number
    const newTotal = parseFloat(newSubtotal.toFixed(2)) + parseFloat(newTaxTotal.toFixed(2));
    setTotal(newTotal);
  }, [watchItems, watchCgstRate, watchSgstRate, watchIgstRate]);

  // Effect to recalculate item amounts when their quantities or rates change
  useEffect(() => {
    if (!firstRender.current) {
      // For each item in the items array, recalculate its amount
      if (watchItems && watchItems.length > 0) {
        watchItems.forEach((item: any, index: number) => {
          if (item.quantity !== undefined && item.rate !== undefined) {
            const amount = calculateAmount(
              Number(item.quantity) || 0,
              Number(item.rate) || 0,
              Number(item.discount) || 0
            );
            
            // Only update if amount has actually changed to avoid loops
            if (Number(item.amount) !== amount) {
              setValue(`items.${index}.amount`, amount);
            }
          }
        });
      }
    } else {
      firstRender.current = false;
    }
  }, [watchItems, setValue]);

  // Add a new function to recalculate totals
  const recalculateTotals = () => {
    const items = getValues('items') || [];
    const newSubtotal = items.reduce((sum: number, item: any) => {
      const itemAmount = parseFloat(item.amount?.toString() || '0');
      return sum + (isNaN(itemAmount) ? 0 : itemAmount);
    }, 0);
    
    setSubtotal(newSubtotal);
    
    // Calculate tax amounts
    const cgstRate = parseFloat(getValues('cgstRate')?.toString() || '0');
    const sgstRate = parseFloat(getValues('sgstRate')?.toString() || '0');
    const igstRate = parseFloat(getValues('igstRate')?.toString() || '0');
    
    const cgstAmount = (newSubtotal * cgstRate) / 100;
    const sgstAmount = (newSubtotal * sgstRate) / 100;
    const igstAmount = (newSubtotal * igstRate) / 100;
    
    const newTaxTotal = parseFloat(cgstAmount.toFixed(2)) + parseFloat(sgstAmount.toFixed(2)) + parseFloat(igstAmount.toFixed(2));
    setTaxTotal(newTaxTotal);
    
    // Calculate total - ensure it's a number operation, not string concatenation
    const newTotal = parseFloat(newSubtotal.toFixed(2)) + parseFloat(newTaxTotal.toFixed(2));
    setTotal(newTotal);
  };

  // Handle product selection change
  const handleProductChange = (index: number, productId: string) => {
    if (!productId || !productsData?.products) return;
    
    const product = productsData.products.find(p => p.id === productId);
    if (!product) return;
    // Get current values
    const currentQty = getValues(`items.${index}.quantity`) || 1;
    const rate = watchType === 'BUYING' ? product.buyingPrice : product.sellingPrice;
    const discount = product.discountPercentage || 0;
    
    // Update fields
    setValue(`items.${index}.productName`, product.name);
    setValue(`items.${index}.quantity`, currentQty);
    setValue(`items.${index}.rate`, rate);
    setValue(`items.${index}.discount`, discount);
    setValue(`items.${index}.hsnCode`, product.hsnCode || '');
    
    // For SELLING invoices, check if the requested quantity exceeds available stock
    if (watchType === 'SELLING' && product.quantity !== undefined) {
      if (currentQty > product.quantity) {
        const warning = `Warning: Only ${product.quantity} units available in stock`;
        setQuantityWarnings(prev => ({ ...prev, [index]: warning }));
      } else {
        // Clear any existing warnings for this item
        if (quantityWarnings[index]) {
          const newWarnings = { ...quantityWarnings };
          delete newWarnings[index];
          setQuantityWarnings(newWarnings);
        }
      }
    }
    
    // Set additional fields for product pricing
    setValue(`items.${index}.mrp`, product.mrp);
    setValue(`items.${index}.sellingPrice`, product.sellingPrice);
    setValue(`items.${index}.wholesalePrice`, product.wholesalePrice);
    
    // Calculate and set amount
    const amount = calculateAmount(currentQty, rate, discount);
    setValue(`items.${index}.amount`, amount);
    
    // Get the updated item
    const updatedItem = getValues(`items.${index}`);
    console.log('Updated product data:', updatedItem);
    
    // Manually trigger a recalculation of totals
    const items = getValues('items');
    const newSubtotal = items.reduce((sum: number, item: any) => {
      const itemAmount = parseFloat(item.amount?.toString() || '0');
      return sum + (isNaN(itemAmount) ? 0 : itemAmount);
    }, 0);
    setSubtotal(newSubtotal);
    
    // Recalculate tax and total
    recalculateTotals();
  };

  // Handle quantity or rate change
  const handleItemCalculation = (index: number) => {    
    // Get the latest values directly
    const item = getValues(`items.${index}`);
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discount) || 0;    
    // Check if quantity exceeds available stock for SELLING invoices
    if (watchType === 'SELLING' && item.productId) {
      const product = productsData?.products?.find(p => p.id === item.productId);
      if (product && product.quantity !== undefined) {
        if (quantity > product.quantity) {
          const warning = `Warning: Only ${product.quantity} units available in stock`;
          setQuantityWarnings(prev => ({ ...prev, [index]: warning }));
        } else {
          // Clear any existing warnings for this item
          if (quantityWarnings[index]) {
            const newWarnings = { ...quantityWarnings };
            delete newWarnings[index];
            setQuantityWarnings(newWarnings);
          }
        }
      }
    }
    
    // Calculate the new amount
    const amount = calculateAmount(quantity, rate, discount);   
    // Update the amount in the form
    setValue(`items.${index}.amount`, amount);
    // Force recalculation of totals
    recalculateTotals();
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
    }
    
    // Manually trigger a recalculation of totals
    const items = getValues('items');
    const newSubtotal = items.reduce((sum: number, item: any) => {
      const itemAmount = parseFloat(item.amount?.toString() || '0');
      return sum + (isNaN(itemAmount) ? 0 : itemAmount);
    }, 0);
    setSubtotal(newSubtotal);
    
    // Recalculate tax amounts
    const cgstRate = parseFloat(getValues('cgstRate')?.toString() || '0');
    const sgstRate = parseFloat(getValues('sgstRate')?.toString() || '0');
    const igstRate = parseFloat(getValues('igstRate')?.toString() || '0');
    const cgstAmount = (newSubtotal * cgstRate) / 100;
    const sgstAmount = (newSubtotal * sgstRate) / 100;
    const igstAmount = (newSubtotal * igstRate) / 100;
    const newTaxTotal = parseFloat(cgstAmount.toFixed(2)) + parseFloat(sgstAmount.toFixed(2)) + parseFloat(igstAmount.toFixed(2));
    setTaxTotal(newTaxTotal);
    
    // Update total as a numeric operation
    const newTotal = parseFloat(newSubtotal.toFixed(2)) + parseFloat(newTaxTotal.toFixed(2));
    setTotal(newTotal);
  };

  // Add a new item row
  const addItem = () => {
    append({
      productId: '',
      productName: '',
      quantity: 1,
      rate: 0,
      discount: 0,
      hsnCode: '',
      amount: 0,
      mrp: 0,
      sellingPrice: 0,
      wholesalePrice: 0
    });
  };

  // Handle form submission
  const onSubmit: SubmitHandler<InvoiceFormData> = async (data) => {
    try {
      // Check for quantity warnings if it's a SELLING invoice
      if (watchType === 'SELLING' && Object.keys(quantityWarnings).length > 0) {
        const confirm = window.confirm("Warning: Some items exceed available quantity in stock. Do you still want to proceed?");
        if (!confirm) return;
      }
      
      console.log('Form submission started with data:', data);
      setIsSubmitting(true);
      setFormError(null); // Clear any previous errors
      
      // Create the invoice data based on type
      const invoiceType = data.type;
      
      // Base invoice data
      const baseInvoiceData = {
        type: invoiceType,
        date: data.date,
        items: data.items.map((item: any, idx: number) => ({
          ...item,
          serialNumber: idx + 1,
          // Ensure numeric fields are properly passed
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          discount: Number(item.discount || 0),
          amount: Number(item.amount || 0),
          // Include the updated product pricing data for buying invoices
          updateProductPricing: invoiceType === 'BUYING' && item.productId ? {
            mrp: Number(item.mrp || 0),
            sellingPrice: Number(item.sellingPrice || 0),
            wholesalePrice: Number(item.wholesalePrice || 0),
            hsnCode: item.hsnCode || ''
          } : undefined
        })),
        cgstRate: parseFloat(data.cgstRate?.toString() || '0'),
        sgstRate: parseFloat(data.sgstRate?.toString() || '0'),
        igstRate: parseFloat(data.igstRate?.toString() || '0'),
        notes: data.notes,
        updateInventory: true,
      };
      
      // Create invoice data object based on type
      let invoiceData: any = { ...baseInvoiceData };
      
      if (invoiceType === 'BUYING') {
        // For buying invoices, only send supplier (sender) details
        // Do NOT send receiver details to backend
        invoiceData = {
          ...invoiceData,
          senderName: data.senderName,
          senderAddress: data.senderAddress,
          senderGST: data.senderGST || '',  // Convert null/undefined to empty string
          senderContact: data.senderContact,
          // Receiver data is handled automatically by the backend based on the session user
        };
      } else {
        // For selling invoices, only send customer (receiver) details
        // Do NOT send sender details to backend
        invoiceData = {
          ...invoiceData,
          receiverName: data.receiverName,
          receiverAddress: data.receiverAddress,
          receiverGST: data.receiverGST || '',  // Convert null/undefined to empty string
          receiverContact: data.receiverContact,
          // Sender data is handled automatically by the backend based on the session user
        };
      }
      // Submit the form
      try {
        const result = await createInvoice(invoiceData).unwrap();
        router.push(`/invoices/${result.id}`);
      } catch (error: any) {
        console.error('API Error:', error);
        // Extract detailed error information
        let errorMessage = 'Failed to create invoice. Please try again.';
        
        if (error.data && error.data.details) {
          errorMessage = error.data.details;
        } else if (error.data && error.data.error) {
          errorMessage = error.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        setFormError(errorMessage);
      }
    } catch (error: any) {
      setFormError('An unexpected error occurred. Please check your form data and try again.');
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

      {/* Quantity Warning Banner */}
      {watchType === 'SELLING' && Object.keys(quantityWarnings).length > 0 && (
        <div className="rounded-md bg-yellow-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Quantity Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Some items exceed the available quantity in stock. You can still proceed, but the inventory will show negative values.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit as any, (errors) => {
        console.error('Form validation errors:', errors);
        setFormError('Please check the form for errors and try again.');
        return false;
      })} className="space-y-8">
        {/* Form submission error */}
        {formError && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error creating invoice</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{formError}</p>
                </div>
              </div>
            </div>
          </div>
        )}
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

        {/* Sender Information - Only show for BUYING invoice type */}
        {watchType === 'BUYING' && (
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Supplier Information
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Enter the supplier details for this purchase.
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
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                    defaultValue=""
                    className="block w-full uppercase rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                  {errors.senderGST && (
                    <p className="mt-2 text-sm text-red-600">{errors.senderGST.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receiver Information - Only show for SELLING invoice type */}
        {watchType === 'SELLING' && (
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Customer Information
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Enter the customer details for this sale.
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
                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                  />
                  {errors.receiverAddress && (
                    <p className="mt-2 text-sm text-red-600">{errors.receiverAddress.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="receiverGST" className="block text-sm font-medium leading-6 text-gray-900">
                  GST Number <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="receiverGST"
                    {...register('receiverGST')}
                    defaultValue=""
                    className="block uppercase w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                  {errors.receiverGST && (
                    <p className="mt-2 text-sm text-red-600">{errors.receiverGST.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Items */}
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900">Invoice Items</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Add items to the invoice or create an empty invoice without items.
          </p>

          <div className="mt-4 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                {fields.length === 0 ? (
                  <div className="bg-gray-50 py-6 px-4 rounded-md text-center">
                    <p className="text-gray-500">No items added to this invoice.</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Item" to add products or submit the form to create an empty invoice.</p>
                  </div>
                ) : (
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
                        HSN Code
                      </th>
                      {watchType === 'BUYING' && (
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          MRP
                        </th>
                      )}
                      {watchType === 'BUYING' ? (
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Selling Price
                        </th>
                      ) : (
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Wholesale Price
                        </th>
                      )}
                      {watchType === 'BUYING' && (
                        <>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Wholesale Price
                          </th>
                        </>
                      )}
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fields.map((field: any, index: number) => (
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
                            {productsData?.products?.map((product: any) => (
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
                              const value = Number(e.target.value);
                              setValue(`items.${index}.quantity`, value);
                              handleItemCalculation(index);
                            }}
                            className={`block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ${
                              quantityWarnings[index] ? 'ring-2 ring-red-500' : 'ring-1 ring-inset ring-gray-300'
                            } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                            min="1"
                            step="1"
                          />
                          {errors.items?.[index]?.quantity && (
                            <p className="mt-2 text-sm text-red-600">{errors.items[index]?.quantity?.message}</p>
                          )}
                          {quantityWarnings[index] && (
                            <p className="mt-2 text-sm text-red-600">{quantityWarnings[index]}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <input
                            type="number"
                            {...register(`items.${index}.rate`)}
                            onChange={(e) => {
                              const value = Number(e.target.value);
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
                              const value = Number(e.target.value);
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
                            type="text"
                            {...register(`items.${index}.hsnCode`)}
                            className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            placeholder="HSN Code"
                          />
                        </td>
                        {watchType === 'BUYING' && (
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <input
                              type="number"
                              {...register(`items.${index}.mrp`)}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setValue(`items.${index}.mrp`, value);
                              }}
                              className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              min="0"
                              step="1"
                            />
                          </td>
                        )}
                        {watchType === 'BUYING' ? (
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <input
                              type="number"
                              {...register(`items.${index}.sellingPrice`)}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setValue(`items.${index}.sellingPrice`, value);
                              }}
                              className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              min="0"
                              step="1"
                            />
                          </td>
                        ) : (
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <input
                              type="number"
                              {...register(`items.${index}.wholesalePrice`)}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setValue(`items.${index}.wholesalePrice`, value);
                              }}
                              className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              min="0"
                              step="1"
                            />
                          </td>
                        )}
                        {watchType === 'BUYING' && (
                          <>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <input
                                type="number"
                                {...register(`items.${index}.wholesalePrice`)}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setValue(`items.${index}.wholesalePrice`, value);
                                }}
                                className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                min="0"
                                step="1"
                              />
                            </td>
                          </>
                        )}
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
                    </tr>
                  </tbody>
                </table>
                )}
                
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                    Add Item
                  </button>
                  
                  {fields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        // Remove all items
                        while (fields.length > 0) {
                          remove(0);
                        }
                      }}
                      className="ml-3 inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                      <TrashIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                      Remove All
                    </button>
                  )}
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
              <dt className="text-sm font-medium leading-6 text-gray-900">CGST ({watchCgstRate}%)</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {formatCurrency((subtotal * watchCgstRate) / 100)}
              </dd>
            </div>
            
            <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">SGST ({watchSgstRate}%)</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {formatCurrency((subtotal * watchSgstRate) / 100)}
              </dd>
            </div>
            
            {watchIgstRate > 0 && (
              <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-900">IGST ({watchIgstRate}%)</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {formatCurrency((subtotal * watchIgstRate) / 100)}
                </dd>
              </div>
            )}
            
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
              className="ml-3 inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : 'Create Invoice'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoicePage;
