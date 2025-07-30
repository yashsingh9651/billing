'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  DocumentArrowDownIcon,
  PhoneIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { 
  useGetInvoiceByIdQuery,
  useUpdateInventoryMutation
} from '@/redux/services/invoiceApiSlice';
import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import domtoimage from 'dom-to-image-more';

// Function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

// Helper function to convert hex color to RGB for PDF
const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex value
  const bigint = parseInt(hex, 16);
  
  // Extract RGB components
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return { r, g, b };
};

// Status badge component
const StatusBadge = ({ status }: { status: 'DRAFT' | 'FINALIZED' | 'PAID' | 'CANCELLED' }) => {
  const statusStyles = {
    PAID: 'bg-green-100 text-green-800 border-green-200',
    FINALIZED: 'bg-blue-100 text-blue-800 border-blue-200',
    DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${statusStyles[status]}`}>
      {status}
    </span>
  );
};

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const { data: invoice, isLoading, error } = useGetInvoiceByIdQuery(params.id);
  const [updateInventory, { isLoading: isInventoryUpdateLoading }] = useUpdateInventoryMutation();
  
  // Debug function to log DOM structure
  const logDOMInfo = (element: HTMLElement | null) => {
    if (!element) {
      console.log('Element is null');
      return;
    }
    
    console.log('Element dimensions:', {
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      clientWidth: element.clientWidth, 
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight
    });
    
    console.log('Element computed style sample:', {
      backgroundColor: window.getComputedStyle(element).backgroundColor,
      color: window.getComputedStyle(element).color,
      display: window.getComputedStyle(element).display,
      position: window.getComputedStyle(element).position,
    });
    
    console.log('Child elements count:', element.children.length);
    console.log('First child element tag:', element.children[0]?.tagName);
  };
  
  // Add an effect to prepare the page for PDF generation when invoice data is loaded
  useEffect(() => {
    if (invoice && invoiceRef.current) {
      // Ensure all images are loaded
      const images = invoiceRef.current.querySelectorAll('img');
      if (images.length > 0) {
        console.log(`Found ${images.length} images, ensuring they load completely`);
        images.forEach(img => {
          if (!img.complete) {
            img.onload = () => console.log(`Image loaded: ${img.src}`);
            img.onerror = () => console.error(`Failed to load image: ${img.src}`);
          }
        });
      }
      
      // Apply special styling for PDF generation
      const styleEl = document.createElement('style');
      styleEl.setAttribute('id', 'pdf-styles');
      styleEl.textContent = `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        // Clean up styles when component unmounts
        const pdfStyles = document.getElementById('pdf-styles');
        if (pdfStyles) {
          document.head.removeChild(pdfStyles);
        }
      };
    }
  }, [invoice]);
  
  // Handle download PDF
  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    console.log('Creating structured PDF document directly with jsPDF');

    try {
      if (!invoice) {
        throw new Error('Invoice data not available');
      }

      // Create a new PDF document with professional formatting
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // Set default font and sizes
      pdf.setFont('helvetica');
      
      // Page constants
      const pageWidth = 210; // A4 width in mm
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Add company logo placeholder (optional)
      // pdf.addImage(logoDataUrl, 'PNG', margin, margin, 40, 15);
      
      // Add header - Invoice Title and Number
      pdf.setFillColor(248, 250, 252); // Light gray background
      pdf.rect(margin, margin, contentWidth, 15, 'F');
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55); // Dark gray text
      pdf.text(`INVOICE #${invoice.invoiceNumber}`, margin, margin + 10);
      
      // Add date and status
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128); // Medium gray
      
      // Format the date
      const dateText = `Date: ${formatDate(invoice.date)}`;
      const statusText = `Status: ${invoice.status}`;
      
      // Add status with color
      pdf.text(dateText, margin, margin + 25);
      pdf.text(statusText, margin + 70, margin + 25);
      
      // Color status indicator box
      const statusColors: Record<string, string[]> = {
        'PAID': ['#dcfce7', '#166534'], // Light green fill, dark green text
        'FINALIZED': ['#dbeafe', '#1e40af'], // Light blue fill, dark blue text
        'DRAFT': ['#f3f4f6', '#1f2937'], // Light gray fill, dark gray text
        'CANCELLED': ['#fee2e2', '#991b1b'], // Light red fill, dark red text
      };
      
      const statusColor = statusColors[invoice.status] || ['#f3f4f6', '#1f2937'];
      
      // Add colored status indicator
      const statusBoxX = margin + 60;
      const statusBoxY = margin + 21;
      pdf.setFillColor(hexToRgb(statusColor[0]).r, hexToRgb(statusColor[0]).g, hexToRgb(statusColor[0]).b);
      pdf.roundedRect(statusBoxX, statusBoxY, 7, 7, 1, 1, 'F');
      
      // Separator line
      pdf.setDrawColor(229, 231, 235); // Light gray
      pdf.line(margin, margin + 30, margin + contentWidth, margin + 30);
      
      // From and To section headers
      const fromToY = margin + 40;
      
      // From (Sender) section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('FROM', margin, fromToY);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(invoice.senderName, margin, fromToY + 8);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      
      // Handle multiline addresses by splitting them
      const senderAddressLines = invoice.senderAddress.split('\n');
      senderAddressLines.forEach((line, index) => {
        pdf.text(line, margin, fromToY + 15 + (index * 5));
      });
      
      // Add sender GST and contact details
      let senderDetailY = fromToY + 15 + (senderAddressLines.length * 5);
      
      if (invoice.senderGST) {
        senderDetailY += 5;
        pdf.text(`GSTIN: ${invoice.senderGST}`, margin, senderDetailY);
      }
      
      senderDetailY += 5;
      pdf.text(`Phone: ${invoice.senderContact}`, margin, senderDetailY);
      
      // To (Receiver) section - right side
      const toX = margin + contentWidth / 2 + 10; // Half the content width + a little spacing
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('TO', toX, fromToY);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(invoice.receiverName, toX, fromToY + 8);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      
      // Handle multiline addresses for receiver
      const receiverAddressLines = invoice.receiverAddress.split('\n');
      receiverAddressLines.forEach((line, index) => {
        pdf.text(line, toX, fromToY + 15 + (index * 5));
      });
      
      // Add receiver GST and contact details
      let receiverDetailY = fromToY + 15 + (receiverAddressLines.length * 5);
      
      if (invoice.receiverGST) {
        receiverDetailY += 5;
        pdf.text(`GSTIN: ${invoice.receiverGST}`, toX, receiverDetailY);
      }
      
      receiverDetailY += 5;
      pdf.text(`Phone: ${invoice.receiverContact}`, toX, receiverDetailY);
      
      // Determine where to start the invoice items table
      const maxDetailY = Math.max(senderDetailY, receiverDetailY);
      const tableStartY = maxDetailY + 15;
      
      // Invoice Items header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('INVOICE ITEMS', margin, tableStartY);
      
      // Draw table headers
      const tableHeaderY = tableStartY + 8;
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, tableHeaderY, contentWidth, 8, 'F');
      
      pdf.setFontSize(9);
      pdf.setTextColor(31, 41, 55);
      
      const colWidths = [
        contentWidth * 0.40, // Item name (40%)
        contentWidth * 0.15, // Quantity (15%)
        contentWidth * 0.15, // Rate (15%)
        contentWidth * 0.15, // Discount (15%)
        contentWidth * 0.15, // Amount (15%)
      ];
      
      const cols = [
        { text: 'ITEM', x: margin },
        { text: 'QTY', x: margin + colWidths[0], align: 'right' },
        { text: 'RATE', x: margin + colWidths[0] + colWidths[1], align: 'right' },
        { text: 'DISCOUNT', x: margin + colWidths[0] + colWidths[1] + colWidths[2], align: 'right' },
        { text: 'AMOUNT', x: margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], align: 'right' }
      ];
      
      cols.forEach(col => {
        if (col.align === 'right') {
          const textWidth = pdf.getTextWidth(col.text);
          pdf.text(col.text, col.x + colWidths[cols.indexOf(col)] - textWidth, tableHeaderY + 5.5);
        } else {
          pdf.text(col.text, col.x, tableHeaderY + 5.5);
        }
      });
      
      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      let yPos = tableHeaderY + 12;
      const rowHeight = 8;
      
      // Draw horizontal line below header
      pdf.line(margin, tableHeaderY + 8, margin + contentWidth, tableHeaderY + 8);
      
      // Draw invoice items
      invoice.items.forEach((item, index) => {
        // Item name
        pdf.text(item.productName, margin, yPos);
        
        // Quantity (right aligned)
        const qtyText = item.quantity.toString();
        const qtyWidth = pdf.getTextWidth(qtyText);
        pdf.text(qtyText, margin + colWidths[0] + colWidths[1] - qtyWidth, yPos);
        
        // Rate (right aligned)
        const rateText = formatCurrency(item.rate);
        const rateWidth = pdf.getTextWidth(rateText);
        pdf.text(rateText, margin + colWidths[0] + colWidths[1] + colWidths[2] - rateWidth, yPos);
        
        // Discount (right aligned)
        const discountText = item.discount > 0 ? `${item.discount}%` : '-';
        const discountWidth = pdf.getTextWidth(discountText);
        pdf.text(discountText, margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - discountWidth, yPos);
        
        // Amount (right aligned)
        const amountText = formatCurrency(item.amount);
        const amountWidth = pdf.getTextWidth(amountText);
        pdf.text(amountText, margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] - amountWidth, yPos);
        
        // Draw horizontal line
        yPos += rowHeight;
        pdf.line(margin, yPos - 3, margin + contentWidth, yPos - 3);
      });
      
      // Summary section (subtotal, taxes, total)
      const summaryX = margin + colWidths[0] + colWidths[1] + colWidths[2];
      let summaryY = yPos + 5;
      
      // Subtotal
      pdf.setFont('helvetica', 'normal');
      pdf.text('Subtotal:', summaryX, summaryY);
      const subtotalText = formatCurrency(invoice.subtotal);
      const subtotalWidth = pdf.getTextWidth(subtotalText);
      pdf.text(subtotalText, margin + contentWidth - subtotalWidth, summaryY);
      
      // GST
      summaryY += 7;
      pdf.text('GST:', summaryX, summaryY);
      const gstText = formatCurrency(invoice.gstAmount);
      const gstWidth = pdf.getTextWidth(gstText);
      pdf.text(gstText, margin + contentWidth - gstWidth, summaryY);
      
      // SGST if applicable
      if (invoice.sgstAmount > 0) {
        summaryY += 7;
        pdf.text('SGST:', summaryX, summaryY);
        const sgstText = formatCurrency(invoice.sgstAmount);
        const sgstWidth = pdf.getTextWidth(sgstText);
        pdf.text(sgstText, margin + contentWidth - sgstWidth, summaryY);
      }
      
      // IGST if applicable
      if (invoice.igstAmount > 0) {
        summaryY += 7;
        pdf.text('IGST:', summaryX, summaryY);
        const igstText = formatCurrency(invoice.igstAmount);
        const igstWidth = pdf.getTextWidth(igstText);
        pdf.text(igstText, margin + contentWidth - igstWidth, summaryY);
      }
      
      // Total line
      summaryY += 7;
      pdf.line(summaryX, summaryY - 2, margin + contentWidth, summaryY - 2);
      
      // Total amount
      summaryY += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('TOTAL:', summaryX, summaryY);
      const totalText = formatCurrency(invoice.totalAmount);
      const totalWidth = pdf.getTextWidth(totalText);
      pdf.text(totalText, margin + contentWidth - totalWidth, summaryY);
      
      // Amount in words
      if (invoice.totalAmountInWords) {
        summaryY += 10;
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Amount in words: ${invoice.totalAmountInWords}`, margin, summaryY);
      }
      
      // Notes section if present
      if (invoice.notes) {
        summaryY += 15;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(31, 41, 55);
        pdf.text('NOTES', margin, summaryY);
        
        summaryY += 7;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        
        // Split notes into lines to fit within content width
        const noteLines = pdf.splitTextToSize(invoice.notes, contentWidth);
        noteLines.forEach((line: string, index: number) => {
          pdf.text(line, margin, summaryY + (index * 5));
        });
      }
      
      // Footer with page number
      const footerY = 287; // Near bottom of page
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Invoice #${invoice.invoiceNumber} - Generated on ${new Date().toLocaleDateString()}`, margin, footerY);
      
      // Save the PDF
      pdf.save(`Invoice-${invoice.invoiceNumber || params.id}.pdf`);
      console.log('Structured PDF generated successfully');
      
    } catch (error) {
      console.error('Error generating structured PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = async () => {
    setIsSharing(true);
    
    try {
      // Create a WhatsApp shareable message
      const message = `Invoice #${invoice?.invoiceNumber || params.id} from ${invoice?.senderName} for ${formatCurrency(invoice?.totalAmount || 0)}. Please check your email for details.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappURL = `https://wa.me/?text=${encodedMessage}`;
      
      // Open WhatsApp in a new tab
      window.open(whatsappURL, '_blank');
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      alert('Failed to share via WhatsApp. Please try again later.');
    } finally {
      setIsSharing(false);
    }
  };
  
  // Handle inventory update
  const handleUpdateInventory = async () => {
    if (!invoice) {
      alert('Invoice data not available');
      return;
    }
    
    // Create the appropriate message based on invoice type
    const confirmMessage = invoice.type === 'BUYING'
      ? 'This will INCREASE inventory quantities for all products in this invoice. Continue?'
      : 'This will DECREASE inventory quantities for all products in this invoice. This cannot be undone. Continue?';
    
    // Confirm with the user
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsUpdatingInventory(true);
    
    try {
      const result = await updateInventory(params.id).unwrap();
      
      if (result.success) {
        const actionText = invoice.type === 'BUYING' ? 'increased' : 'decreased';
        alert(`Inventory updated successfully! ${result.results?.length || 0} products ${actionText}.`);
      } else {
        alert(`Failed to update inventory: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Failed to update inventory. Please try again later.');
    } finally {
      setIsUpdatingInventory(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error || !invoice) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="text-red-500 mb-4">Failed to load invoice details.</div>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="mr-4 rounded-md bg-white p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-semibold leading-7 text-gray-900">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              {formatDate(invoice.date)} • <StatusBadge status={invoice.status} />
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex gap-3 sm:mt-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            {isPdfGenerating ? 'Generating...' : 'Download PDF'}
          </button>
          
          <button
            type="button"
            onClick={handleWhatsAppShare}
            disabled={isSharing}
            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <PhoneIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            {isSharing ? 'Sharing...' : 'Share via WhatsApp'}
          </button>
          
          {/* Show Update Inventory button for both buying and selling invoices */}
          <button
            type="button"
            onClick={handleUpdateInventory}
            disabled={isUpdatingInventory || isInventoryUpdateLoading}
            className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${
              invoice.type === 'BUYING' 
                ? 'bg-orange-600 hover:bg-orange-500 focus-visible:outline-orange-600' 
                : 'bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600'
            }`}
            title={invoice.type === 'BUYING' ? 'Increase inventory quantities' : 'Decrease inventory quantities'}
          >
            <ShoppingCartIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            {isUpdatingInventory ? 'Updating...' : invoice.type === 'BUYING' ? 'Stock In' : 'Stock Out'}
          </button>
          
          <Link
            href={`/dashboard/invoices/${params.id}/edit`}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Edit Invoice
          </Link>
        </div>
      </div>
      
      {/* Invoice Content */}
      <div ref={invoiceRef} className="overflow-hidden bg-white shadow sm:rounded-lg" data-pdf-container>
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
            {/* Invoice Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">Invoice Information</h3>
                <dl className="mt-2 divide-y divide-gray-100">
                  <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                    <dt className="text-gray-500">Invoice Number</dt>
                    <dd className="text-gray-900">{invoice.invoiceNumber}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                    <dt className="text-gray-500">Date</dt>
                    <dd className="text-gray-900">{formatDate(invoice.date)}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                    <dt className="text-gray-500">Status</dt>
                    <dd className="text-gray-900">
                      <StatusBadge status={invoice.status} />
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                    <dt className="text-gray-500">Type</dt>
                    <dd className="text-gray-900">
                      <span className={invoice.type === 'SELLING' ? 'text-indigo-600' : 'text-orange-600'}>
                        {invoice.type === 'SELLING' ? 'Selling' : 'Buying'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
              
              {/* From (Sender) */}
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">From</h3>
                <dl className="mt-2 space-y-2 text-sm text-gray-900">
                  <div>
                    <dt className="sr-only">Name</dt>
                    <dd className="font-medium">{invoice.senderName}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Address</dt>
                    <dd className="whitespace-pre-line">{invoice.senderAddress}</dd>
                  </div>
                  {invoice.senderGST && (
                    <div>
                      <dt className="sr-only">GST</dt>
                      <dd>GSTIN: {invoice.senderGST}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="sr-only">Contact</dt>
                    <dd>Phone: {invoice.senderContact}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* To (Receiver) */}
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">To</h3>
              <dl className="mt-2 space-y-2 text-sm text-gray-900">
                <div>
                  <dt className="sr-only">Name</dt>
                  <dd className="font-medium">{invoice.receiverName}</dd>
                </div>
                <div>
                  <dt className="sr-only">Address</dt>
                  <dd className="whitespace-pre-line">{invoice.receiverAddress}</dd>
                </div>
                {invoice.receiverGST && (
                  <div>
                    <dt className="sr-only">GST</dt>
                    <dd>GSTIN: {invoice.receiverGST}</dd>
                  </div>
                )}
                <div>
                  <dt className="sr-only">Contact</dt>
                  <dd>Phone: {invoice.receiverContact}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        
        {/* Line Items */}
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Invoice Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Item
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Quantity
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Rate
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Discount
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items.map((item) => (
                  <tr key={item.id || item.serialNumber}>
                    <td className="py-4 pl-4 pr-3 text-sm sm:pl-0">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 text-right">{item.quantity}</td>
                    <td className="px-3 py-4 text-sm text-gray-500 text-right">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 text-right">
                      {item.discount > 0 ? `${item.discount}%` : '-'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th
                    scope="row"
                    colSpan={4}
                    className="hidden pt-6 pl-4 pr-3 text-right text-sm font-normal text-gray-500 sm:table-cell sm:pl-0"
                  >
                    Subtotal
                  </th>
                  <td className="pt-6 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-0">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
                <tr>
                  <th
                    scope="row"
                    colSpan={4}
                    className="hidden pt-4 pl-4 pr-3 text-right text-sm font-normal text-gray-500 sm:table-cell sm:pl-0"
                  >
                    GST
                  </th>
                  <td className="pt-4 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-0">
                    {formatCurrency(invoice.gstAmount)}
                  </td>
                </tr>
                {invoice.sgstAmount > 0 && (
                  <tr>
                    <th
                      scope="row"
                      colSpan={4}
                      className="hidden pt-4 pl-4 pr-3 text-right text-sm font-normal text-gray-500 sm:table-cell sm:pl-0"
                    >
                      SGST
                    </th>
                    <td className="pt-4 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-0">
                      {formatCurrency(invoice.sgstAmount)}
                    </td>
                  </tr>
                )}
                {invoice.igstAmount > 0 && (
                  <tr>
                    <th
                      scope="row"
                      colSpan={4}
                      className="hidden pt-4 pl-4 pr-3 text-right text-sm font-normal text-gray-500 sm:table-cell sm:pl-0"
                    >
                      IGST
                    </th>
                    <td className="pt-4 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-0">
                      {formatCurrency(invoice.igstAmount)}
                    </td>
                  </tr>
                )}
                <tr>
                  <th
                    scope="row"
                    colSpan={4}
                    className="hidden pt-4 pl-4 pr-3 text-right text-sm font-semibold text-gray-900 sm:table-cell sm:pl-0"
                  >
                    Total
                  </th>
                  <td className="pt-4 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-0">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Amount in words */}
          {invoice.totalAmountInWords && (
            <div className="mt-8 text-right text-sm text-gray-500">
              Amount in words: {invoice.totalAmountInWords}
            </div>
          )}
        </div>
        
        {/* Notes */}
        {invoice.notes && (
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Notes</h3>
            <div className="mt-2 text-sm text-gray-500 whitespace-pre-line">
              {invoice.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
