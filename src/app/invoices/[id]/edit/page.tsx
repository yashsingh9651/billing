'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, PlusIcon, TrashIcon, XCircleIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useGetProductsQuery } from '@/redux/services/productApiSlice';
import { useGetInvoiceByIdQuery, useUpdateInvoiceMutation, useUpdateInventoryMutation } from '@/redux/services/invoiceApiSlice';
import { formatCurrency, calculateAmount } from '@/lib/utils';

// Spinner component for loading states
const Spinner = ({ className = "", size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };
  
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

// Form schema for validation
const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  rate: z.coerce.number().min(0, 'Rate must be 0 or greater'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot be more than 100%'),
  amount: z.coerce.number().min(0, 'Amount must be 0 or greater'),
  hsnCode: z.string().optional(),
  // Fields for buying invoices
  mrp: z.coerce.number().min(0, 'MRP cannot be negative').optional(),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').optional(),
  wholesalePrice: z.coerce.number().min(0, 'Wholesale price cannot be negative').optional(),
});

const invoiceSchema = z.object({
  type: z.enum(['BUYING', 'SELLING']),
  date: z.string().min(1, 'Date is required'),
  
  // Sender info (for BUYING invoices)
  senderName: z.string().min(1, 'Sender name is required'),
  senderAddress: z.string().min(1, 'Sender address is required'),
  senderGST: z.string().nullable().optional(),
  senderContact: z.string().min(1, 'Sender contact is required'),
  
  // Receiver info (for SELLING invoices)
  receiverName: z.string().min(1, 'Receiver name is required'),
  receiverAddress: z.string().min(1, 'Receiver address is required'),
  receiverGST: z.string().nullable().optional(),
  receiverContact: z.string().min(1, 'Receiver contact is required'),
  
  // Items
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  
  // Tax rates
  cgstRate: z.coerce.number().min(0, 'CGST rate cannot be negative').max(100, 'CGST rate cannot exceed 100%'),
  sgstRate: z.coerce.number().min(0, 'SGST rate cannot be negative').max(100, 'SGST rate cannot exceed 100%'),
  igstRate: z.coerce.number().min(0, 'IGST rate cannot be negative').max(100, 'IGST rate cannot exceed 100%'),
  
  // Additional fields
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'FINALIZED', 'PAID', 'CANCELLED']).optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null;
  
  // State variables
  const [subtotal, setSubtotal] = useState<number>(0);
  const [taxTotal, setTaxTotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [quantityWarnings, setQuantityWarnings] = useState<Record<number, string>>({});
  const firstRender = useRef<boolean>(true);
  
  // Get user session and business details
  const { data: session } = useSession();
  const businessDetails = {
    name: session?.user?.businessName || '',
    address: session?.user?.businessAddress || '',
    gst: session?.user?.businessGST || '',
    contact: session?.user?.businessContact || '',
  };
  
  // API queries
  const { data: productsData, isLoading: isProductsLoading } = useGetProductsQuery();
  const { data: invoiceData, isLoading: isInvoiceLoading } = useGetInvoiceByIdQuery(invoiceId as string);
  const [updateInvoice, { isLoading: isUpdateLoading }] = useUpdateInvoiceMutation();
  const [updateInventory] = useUpdateInventoryMutation();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    reset,
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
      status: 'DRAFT',
    },
  });

  // Use field array for dynamic invoice items
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch form values for reactive updates
  const watchType = watch('type');
  const watchItems = watch('items');
  const watchCgstRate = watch('cgstRate');
  const watchSgstRate = watch('sgstRate');
  const watchIgstRate = watch('igstRate');

  // Reset form when invoice data is loaded
  useEffect(() => {
    if (invoiceData) {
      // Convert date format for form
      const formattedDate = new Date(invoiceData.date).toISOString().split('T')[0];
      
      // Reset form with invoice data
      reset({
        type: invoiceData.type,
        date: formattedDate,
        senderName: invoiceData.senderName,
        senderAddress: invoiceData.senderAddress,
        senderGST: invoiceData.senderGST || '',
        senderContact: invoiceData.senderContact,
        receiverName: invoiceData.receiverName,
        receiverAddress: invoiceData.receiverAddress,
        receiverGST: invoiceData.receiverGST || '',
        receiverContact: invoiceData.receiverContact,
        items: invoiceData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount,
          amount: item.amount,
          hsnCode: item.hsnCode || '',
        })),
        cgstRate: invoiceData.cgstRate || 0,
        sgstRate: invoiceData.sgstRate || 0,
        igstRate: invoiceData.igstRate || 0,
        notes: invoiceData.notes || '',
        status: invoiceData.status as any,
      });
      
      // Calculate totals
      calculateTotals(invoiceData.items);
      
      // Check for quantity warnings in SELLING invoices
      if (invoiceData.type === 'SELLING' && productsData) {
        const products = Array.isArray(productsData) ? productsData : [];
        const newWarnings: Record<number, string> = {};
        
        invoiceData.items.forEach((item, index) => {
          const product = products.find(p => p.id === item.productId);
          if (product && product.quantity < item.quantity) {
            newWarnings[index] = `Warning: Only ${product.quantity} units available in stock`;
          }
        });
        
        setQuantityWarnings(newWarnings);
      }
    }
  }, [invoiceData, reset, productsData]);

  // Calculate totals on every items change
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    calculateTotals(watchItems);
  }, [watchItems, watchCgstRate, watchSgstRate, watchIgstRate]);

  // Handle product selection
  const handleProductChange = (index: number, productId: string) => {
    if (!productId || !productsData) return;
    
    // Handle both array and object with products property structure
    const products = Array.isArray(productsData) 
      ? productsData 
      : productsData.products || [];
    
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    
    // Set product name
    setValue(`items.${index}.productName`, product.name);
    
    // Set appropriate price based on invoice type
    if (watchType === 'BUYING') {
      // For buying invoices, use the buying price
      setValue(`items.${index}.rate`, product.buyingPrice || 0);
    } else {
      // For selling invoices, use the selling price
      setValue(`items.${index}.rate`, product.sellingPrice || 0);
      
      // Check available inventory for selling invoices
      if (product.quantity < getValues(`items.${index}.quantity`)) {
        setQuantityWarnings(prev => ({
          ...prev,
          [index]: `Warning: Only ${product.quantity} units available in stock`
        }));
      } else {
        setQuantityWarnings(prev => {
          const newWarnings = { ...prev };
          delete newWarnings[index];
          return newWarnings;
        });
      }
    }
    
    // Set HSN code if available
    setValue(`items.${index}.hsnCode`, product.hsnCode || '');
    
    // Set discount if available (default to 0)
    setValue(`items.${index}.discount`, product.discount || 0);
    
    // Set quantity to 1 if not already set
    if (!getValues(`items.${index}.quantity`)) {
      setValue(`items.${index}.quantity`, 1);
    }
    
    // Recalculate amount
    calculateItemAmount(index);
  };

  // Calculate a single item's amount
  const calculateItemAmount = (index: number) => {
    const quantity = parseFloat(getValues(`items.${index}.quantity`)?.toString() || '0');
    const rate = parseFloat(getValues(`items.${index}.rate`)?.toString() || '0');
    const discount = parseFloat(getValues(`items.${index}.discount`)?.toString() || '0');
    
    const amount = calculateAmount(quantity, rate, discount);
    setValue(`items.${index}.amount`, amount);
    
    // Recalculate totals after updating item
    recalculateTotals();
    
    // Update quantity warnings for selling invoices
    if (watchType === 'SELLING' && productsData) {
      const products = Array.isArray(productsData) ? productsData : [];
      const productId = getValues(`items.${index}.productId`);
      const product = products.find(p => p.id === productId);
      
      if (product && product.quantity < quantity) {
        setQuantityWarnings(prev => ({
          ...prev,
          [index]: `Warning: Only ${product.quantity} units available in stock`
        }));
      } else {
        setQuantityWarnings(prev => {
          const newWarnings = { ...prev };
          delete newWarnings[index];
          return newWarnings;
        });
      }
    }
  };

  // Recalculate all totals based on current values
  const recalculateTotals = () => {
    const items = getValues('items') || [];
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
    
    // Update total
    const newTotal = parseFloat(newSubtotal.toFixed(2)) + parseFloat(newTaxTotal.toFixed(2));
    setTotal(newTotal);
  };
  
  // For backward compatibility with the existing code
  const calculateTotals = (items: any[]) => {
    recalculateTotals();
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
      
      setIsSubmitting(true);
      setFormError(null);
      
      // Add serialNumber to items before submitting
      const itemsWithSerialNumber = data.items.map((item, index) => ({
        ...item,
        serialNumber: index + 1
      }));
      
      // Prepare the data for the API
      const formattedData = {
        id: invoiceId as string, // Ensure id is a string
        ...data,
        // Convert null to undefined for GST fields to match API expectations
        senderGST: data.senderGST || undefined,
        receiverGST: data.receiverGST || undefined,
        items: itemsWithSerialNumber,
        subtotal: subtotal,
      };
      
      // Update the invoice
      const updatedInvoice = await updateInvoice(formattedData).unwrap();
      
      // Show success message
      setSaveSuccess(true);
      
      // Update the inventory
      const inventoryResult = await updateInventory(invoiceId as string).unwrap();
      
      if (!inventoryResult.success) {
        setFormError(`Invoice updated but inventory update failed: ${inventoryResult.message}`);
      } else {
        // Clear any existing error
        setFormError(null);
        
        // Wait a moment before redirecting to show success message
        setTimeout(() => {
          router.push(`/invoices/${invoiceId}`);
        }, 1500);
      }
      
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      setFormError(`Failed to update invoice: ${error.data?.error || 'Please try again'}`);
      setSaveSuccess(false);
      setSaveError(error.data?.error || 'An error occurred while saving the invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers for field changes
  const handleQuantityChange = (index: number) => {
    calculateItemAmount(index);
  };

  const handleRateChange = (index: number) => {
    calculateItemAmount(index);
  };

  const handleDiscountChange = (index: number) => {
    calculateItemAmount(index);
  };

  if (!invoiceId) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Invalid invoice ID. <a href="/invoices" className="font-medium underline text-red-700 hover:text-red-600">Go back to invoices</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isInvoiceLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Invoice not found. <a href="/invoices" className="font-medium underline text-red-700 hover:text-red-600">Go back to invoices</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="space-y-10 divide-y divide-gray-900/10">
        {/* Notifications */}
        {saveSuccess && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Invoice updated successfully! Redirecting...
                </p>
              </div>
            </div>
          </div>
        )}
        {saveError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {saveError}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-7 text-gray-900">Edit Invoice</h1>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Update the details for this {watchType?.toLowerCase()} invoice.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowLeftIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            Back
          </button>
        </div>
        
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900">
            Edit Invoice #{invoiceData.invoiceNumber}
          </h2>
        </div>

        {formError && (
          <div className="rounded-md bg-red-50 p-4 my-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{formError}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 divide-y divide-gray-900/10">
          {/* Invoice Basic Details */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
            <div className="px-4 sm:px-0">
              <h2 className="text-base font-semibold leading-7 text-gray-900">Invoice Details</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Basic information about the invoice.
              </p>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
              <div className="px-4 py-6 sm:p-8">
                <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Invoice Number
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        disabled
                        value={invoiceData.invoiceNumber}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Date
                    </label>
                    <div className="mt-2">
                      <input
                        type="date"
                        {...register('date')}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                      {errors.date && (
                        <p className="mt-2 text-sm text-red-600">{errors.date.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Invoice Type
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        disabled
                        value={invoiceData.type}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-gray-100"
                      />
                      <input type="hidden" {...register('type')} value={invoiceData.type} />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Status
                    </label>
                    <div className="mt-2">
                      <select
                        {...register('status')}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="FINALIZED">Finalized</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Notes
                    </label>
                    <div className="mt-2">
                      <textarea
                        rows={3}
                        {...register('notes')}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sender/Receiver Information */}
          {watchType === 'BUYING' && (
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h2 className="text-base font-semibold leading-7 text-gray-900">Supplier Information</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Details of the supplier (sender) for this buying invoice.
                </p>
              </div>

              <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
                <div className="px-4 py-6 sm:p-8">
                  <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Supplier Name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          {...register('senderName')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.senderName && (
                          <p className="mt-2 text-sm text-red-600">{errors.senderName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Supplier Contact
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          {...register('senderContact')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.senderContact && (
                          <p className="mt-2 text-sm text-red-600">{errors.senderContact.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Supplier Address
                      </label>
                      <div className="mt-2">
                        <textarea
                          rows={3}
                          {...register('senderAddress')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.senderAddress && (
                          <p className="mt-2 text-sm text-red-600">{errors.senderAddress.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Supplier GST (optional)
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          {...register('senderGST')}
                          className="block uppercase w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.senderGST && (
                          <p className="mt-2 text-sm text-red-600">{errors.senderGST.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {watchType === 'SELLING' && (
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h2 className="text-base font-semibold leading-7 text-gray-900">Customer Information</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Details of the customer (receiver) for this selling invoice.
                </p>
              </div>

              <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
                <div className="px-4 py-6 sm:p-8">
                  <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Customer Name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          {...register('receiverName')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.receiverName && (
                          <p className="mt-2 text-sm text-red-600">{errors.receiverName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Customer Contact
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          {...register('receiverContact')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.receiverContact && (
                          <p className="mt-2 text-sm text-red-600">{errors.receiverContact.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Customer Address
                      </label>
                      <div className="mt-2">
                        <textarea
                          rows={3}
                          {...register('receiverAddress')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.receiverAddress && (
                          <p className="mt-2 text-sm text-red-600">{errors.receiverAddress.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        Customer GST (optional)
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          {...register('receiverGST')}
                          className="block uppercase w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.receiverGST && (
                          <p className="mt-2 text-sm text-red-600">{errors.receiverGST.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Items */}
          <div className="pt-10">
            <h2 className="text-base font-semibold leading-7 text-gray-900">Invoice Items</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Add or edit items in the invoice.
            </p>

            <div className="mt-4 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  {fields.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                            Product
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            HSN
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
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {fields.map((field, index) => (
                          <tr key={field.id} className={
                            watchType === 'SELLING' && 
                            quantityWarnings[index] ? 
                            'bg-amber-50' : ''
                          }>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                              <select
                                {...register(`items.${index}.productId`)}
                                onChange={(e) => {
                                  // Update the productId field and handle product selection
                                  handleProductChange(index, e.target.value);
                                  // Force recalculation after selection
                                  setTimeout(() => calculateItemAmount(index), 100);
                                }}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              >
                                <option value="">Select a product</option>
                                {isProductsLoading ? (
                                  <option value="" disabled>Loading products...</option>
                                ) : productsData?.products?.map((product: any) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                    {watchType === 'SELLING' && product.quantity !== undefined 
                                      ? ` (${product.quantity} in stock)` 
                                      : ''}
                                  </option>
                                ))}
                              </select>
                              {getValues(`items.${index}.productName`) && (
                                <div className="mt-1 text-xs">
                                  <span className="text-green-600 font-medium">
                                    {getValues(`items.${index}.productName`)}
                                  </span>
                                  {watchType === 'SELLING' && productsData && (
                                    <>
                                      {/* Get the current product and show stock info */}
                                      {(() => {
                                        const productId = getValues(`items.${index}.productId`);
                                        const product = Array.isArray(productsData) 
                                          ? productsData.find(p => p.id === productId)
                                          : null;
                                        
                                        if (product) {
                                          const quantity = getValues(`items.${index}.quantity`);
                                          const isLowStock = product.quantity < quantity;
                                          
                                          return (
                                            <span className={`ml-2 ${isLowStock ? 'text-amber-600' : 'text-blue-600'}`}>
                                              ({product.quantity} in stock)
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </>
                                  )}
                                </div>
                              )}
                              {errors.items?.[index]?.productId && (
                                <p className="mt-2 text-sm text-red-600">
                                  {errors.items[index]?.productId?.message}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <input
                                type="text"
                                {...register(`items.${index}.hsnCode`)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                {...register(`items.${index}.quantity`)}
                                onChange={() => handleQuantityChange(index)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              />
                              {errors.items?.[index]?.quantity && (
                                <p className="mt-2 text-sm text-red-600">
                                  {errors.items[index]?.quantity?.message}
                                </p>
                              )}
                              {quantityWarnings[index] && (
                                <p className="mt-2 text-sm text-amber-600">
                                  {quantityWarnings[index]}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register(`items.${index}.rate`)}
                                onChange={() => handleRateChange(index)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              />
                              {errors.items?.[index]?.rate && (
                                <p className="mt-2 text-sm text-red-600">
                                  {errors.items[index]?.rate?.message}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                {...register(`items.${index}.discount`)}
                                onChange={() => handleDiscountChange(index)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              />
                              {errors.items?.[index]?.discount && (
                                <p className="mt-2 text-sm text-red-600">
                                  {errors.items[index]?.discount?.message}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register(`items.${index}.amount`)}
                                readOnly
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-gray-50"
                              />
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-5 w-5" aria-hidden="true" />
                                <span className="sr-only">Remove item {index + 1}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-4 px-6 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-500">No items added to this invoice yet. Click "Add Item" to begin.</p>
                    </div>
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
                  
                  {/* Tax rates */}
                  <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        CGST Rate (%)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          {...register('cgstRate')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.cgstRate && (
                          <p className="mt-2 text-sm text-red-600">{errors.cgstRate.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        SGST Rate (%)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          {...register('sgstRate')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.sgstRate && (
                          <p className="mt-2 text-sm text-red-600">{errors.sgstRate.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-gray-900">
                        IGST Rate (%)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          {...register('igstRate')}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                        {errors.igstRate && (
                          <p className="mt-2 text-sm text-red-600">{errors.igstRate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="mt-8 border-t border-gray-200 pt-8">
                    <div className="flex justify-end">
                      <dl className="w-64 space-y-4">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-900">Subtotal</dt>
                          <dd className="text-sm font-medium text-gray-900">₹{subtotal.toFixed(2)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-900">CGST ({watchCgstRate}%)</dt>
                          <dd className="text-sm font-medium text-gray-900">₹{((subtotal * watchCgstRate) / 100).toFixed(2)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-900">SGST ({watchSgstRate}%)</dt>
                          <dd className="text-sm font-medium text-gray-900">₹{((subtotal * watchSgstRate) / 100).toFixed(2)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-900">IGST ({watchIgstRate}%)</dt>
                          <dd className="text-sm font-medium text-gray-900">₹{((subtotal * watchIgstRate) / 100).toFixed(2)}</dd>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-4">
                          <dt className="text-base font-medium text-gray-900">Total</dt>
                          <dd className="text-base font-medium text-gray-900">₹{total.toFixed(2)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="mt-10 flex justify-end border-t border-gray-200 pt-6">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="rounded-md bg-white py-2 px-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="ml-3 inline-flex justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Updating...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
