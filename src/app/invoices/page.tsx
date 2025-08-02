'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useGetInvoicesQuery, useDeleteInvoiceMutation } from '@/redux/services/invoiceApiSlice';
import { formatCurrency, formatDate } from '@/lib/utils';

// Function to calculate the total invoice amount
const calculateInvoiceTotal = (invoice: any) => {
  if (!invoice) return 0;
  
  const subtotal = invoice.subtotal || 0;
  const cgstRate = invoice.cgstRate || 0;
  const sgstRate = invoice.sgstRate || 0;
  const igstRate = invoice.igstRate || 0;
  
  const cgst = (subtotal * cgstRate) / 100;
  const sgst = (subtotal * sgstRate) / 100;
  const igst = (subtotal * igstRate) / 100;
  
  const totalTax = cgst + sgst + igst;
  const totalBeforeRounding = subtotal + totalTax;
  const roundOffAmount = invoice.roundOffAmount || Math.round((totalBeforeRounding - Math.floor(totalBeforeRounding)) * 100) / 100;
  
  // Return the rounded total
  return Math.round(totalBeforeRounding);
};

// Invoice type filter options
const invoiceTypeFilters = [
  { id: 'all', name: 'All' },
  { id: 'BUYING', name: 'Buying' },
  { id: 'SELLING', name: 'Selling' },
];

// Invoice status options for filtering
const statusOptions = [
  { id: 'all', name: 'All Statuses' },
  { id: 'DRAFT', name: 'Draft' },
  { id: 'FINALIZED', name: 'Finalized' },
  { id: 'PAID', name: 'Paid' },
  { id: 'CANCELLED', name: 'Cancelled' },
];

// Invoice status component with appropriate colors
const InvoiceStatusBadge = ({ status }: { status: string }) => {
  let colorClass = '';

  switch (status) {
    case 'PAID':
      colorClass = 'bg-green-100 text-green-800';
      break;
    case 'FINALIZED':
      colorClass = 'bg-blue-100 text-blue-800';
      break;
    case 'DRAFT':
      colorClass = 'bg-yellow-100 text-yellow-800';
      break;
    case 'CANCELLED':
      colorClass = 'bg-red-100 text-red-800';
      break;
    default:
      colorClass = 'bg-gray-100 text-gray-800';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

export default function InvoicesPage() {
  const router = useRouter();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  
  // Get all invoices
  const { data, isLoading, isError, refetch } = useGetInvoicesQuery();
  const invoices = data || [];

  // Filter invoices based on selected filters and search query
  const filteredInvoices = invoices.filter(invoice => {
    // Filter by type
    if (selectedTypeFilter !== 'all' && invoice.type !== selectedTypeFilter) {
      return false;
    }
    
    // Filter by status
    if (selectedStatusFilter !== 'all' && invoice.status !== selectedStatusFilter) {
      return false;
    }
    
    // Filter by search query (invoice number, sender or receiver name)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const invoiceNumber = invoice.invoiceNumber.toLowerCase();
      const senderName = invoice.senderName.toLowerCase();
      const receiverName = invoice.receiverName.toLowerCase();
      
      if (!invoiceNumber.includes(searchLower) && 
          !senderName.includes(searchLower) && 
          !receiverName.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });

  // Handle invoice deletion
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(id).unwrap();
        refetch(); // Refresh the list after deletion
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice.');
      }
    }
  };

  // Handle downloading invoice as PDF
  const handleDownloadPdf = (id: string) => {
    // Open PDF in a new tab
    window.open(`/api/invoices/${id}/pdf`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading invoices</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>There was an error loading the invoices. Please try again later.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Invoices</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all invoices including their number, date, type, amount, and status.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/invoices/create"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <span className="flex items-center">
              <PlusIcon className="h-5 w-5 mr-1" aria-hidden="true" />
              Create Invoice
            </span>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          
          {/* Type Filter */}
          <div className="inline-flex shadow-sm rounded-md">
            {invoiceTypeFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedTypeFilter(filter.id)}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium ${
                  selectedTypeFilter === filter.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                  filter.id === 'all' ? 'rounded-l-md' : ''
                } ${filter.id === 'SELLING' ? 'rounded-r-md' : ''}`}
              >
                {filter.name}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            className="rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-10 bg-white px-4 sm:px-6 lg:px-8">
                  <p className="text-gray-500 mt-4">No invoices found matching your filters.</p>
                  <div className="mt-6">
                    <Link
                      href="/invoices/create"
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                      Create a new invoice
                    </Link>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Invoice #
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        From
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        To
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-indigo-600 sm:pl-6">
                          <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                            INV-{invoice.invoiceNumber.toString().padStart(5, '0')}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDate(invoice.date)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              invoice.type === 'SELLING' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {invoice.type === 'SELLING' ? 'Sales' : 'Purchase'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {invoice.senderName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {invoice.receiverName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatCurrency(calculateInvoiceTotal(invoice))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <InvoiceStatusBadge status={invoice.status} />
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end space-x-3">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="View"
                            >
                              View
                            </Link>
                            <Link
                              href={`/invoices/${invoice.id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" aria-hidden="true" />
                            </Link>
                            <button
                              onClick={() => handleDownloadPdf(invoice.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Download PDF"
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
