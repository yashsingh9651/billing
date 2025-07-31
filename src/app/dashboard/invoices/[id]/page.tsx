"use client";
import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  useGetInvoiceByIdQuery,
  useUpdateInventoryMutation,
} from "@/redux/services/invoiceApiSlice";
import { formatCurrency } from "@/lib/utils";
import jsPDF from "jspdf";
import QRCode from "qrcode";

// Function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

// Status badge component
const StatusBadge = ({
  status,
}: {
  status: "DRAFT" | "FINALIZED" | "PAID" | "CANCELLED";
}) => {
  const statusStyles = {
    PAID: "bg-green-100 text-green-800 border-green-200",
    FINALIZED: "bg-blue-100 text-blue-800 border-blue-200",
    DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
};

// Function to convert number to words (Indian format)
const numberToWords = (num: number): string => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const remainder = num % 100;

  let result = "";

  if (crores > 0) result += convertHundreds(crores) + " Crore ";
  if (lakhs > 0) result += convertHundreds(lakhs) + " Lakh ";
  if (thousands > 0) result += convertHundreds(thousands) + " Thousand ";
  if (hundreds > 0) result += ones[hundreds] + " Hundred ";

  if (remainder > 0) {
    if (remainder < 10) {
      result += ones[remainder];
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else {
      result += tens[Math.floor(remainder / 10)];
      if (remainder % 10 > 0) {
        result += " " + ones[remainder % 10];
      }
    }
  }

  return result.trim();

  function convertHundreds(n: number): string {
    let result = "";
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) result += ones[h] + " Hundred ";

    if (remainder > 0) {
      if (remainder < 10) {
        result += ones[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        result += tens[Math.floor(remainder / 10)];
        if (remainder % 10 > 0) {
          result += " " + ones[remainder % 10];
        }
      }
    }

    return result.trim();
  }
};

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading, error } = useGetInvoiceByIdQuery(params.id);
  const [updateInventory] = useUpdateInventoryMutation();

  // Generate QR Code
  const generateQRCode = async (data: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(data, {
        width: 100,
        margin: 1,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      return "";
    }
  };

  // Handle download PDF with Indian GST format
  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);

    try {
      if (!invoice) throw new Error("Invoice data not available");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = 210;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      // Generate QR Code
      const qrData = `Invoice: ${invoice.invoiceNumber}, Date: ${invoice.date}, Amount: ${invoice.totalAmount}, GSTIN: ${invoice.senderGST}`;
      const qrCodeDataUrl = await generateQRCode(qrData);

      // Header - Tax Invoice
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Tax Invoice", margin, margin + 10);
      pdf.setFontSize(10);
      pdf.text("(ORIGINAL FOR RECIPIENT)", margin, margin + 16);

      // e-Invoice label
      pdf.text("e-Invoice", pageWidth - margin - 25, margin + 10);

      // Add QR Code
      if (qrCodeDataUrl) {
        pdf.addImage(
          qrCodeDataUrl,
          "PNG",
          pageWidth - margin - 25,
          margin + 15,
          20,
          20
        );
      }

      let yPos = margin + 25;

      // IRN and Invoice Details
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(`IRN: ${invoice.irn || "N/A"}`, margin, yPos);
      pdf.text(`Invoice No: ${invoice.invoiceNumber}`, margin + 100, yPos);
      yPos += 4;
      pdf.text(`Ack No: ${invoice.ackNo || "N/A"}`, margin, yPos);
      pdf.text(`Dated: ${formatDate(invoice.date)}`, margin + 100, yPos);
      yPos += 4;
      pdf.text(`Ack Date: ${formatDate(invoice.date)}`, margin, yPos);

      yPos += 10;

      // Company Details Section
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(margin, yPos, contentWidth, 35);

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(invoice.senderName, margin + 2, yPos + 8);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const senderAddressLines = invoice.senderAddress.split("\n");
      senderAddressLines.forEach((line, index) => {
        pdf.text(line, margin + 2, yPos + 15 + index * 3);
      });

      pdf.text(
        `GSTIN/UIN: ${invoice.senderGST || "N/A"}`,
        margin + 2,
        yPos + 28
      );
      pdf.text(
        `State Name: ${invoice.senderState || "N/A"}, Code: 09`,
        margin + 2,
        yPos + 32
      );
      pdf.text(
        `E-Mail: ${invoice.senderEmail || "N/A"}`,
        margin + 100,
        yPos + 28
      );
      pdf.text(`Contact: ${invoice.senderContact}`, margin + 100, yPos + 32);

      yPos += 40;

      // Consignee and Buyer Details
      pdf.rect(margin, yPos, contentWidth / 2, 30);
      pdf.rect(margin + contentWidth / 2, yPos, contentWidth / 2, 30);

      // Consignee
      pdf.setFont("helvetica", "bold");
      pdf.text("Consignee (Ship to)", margin + 2, yPos + 6);
      pdf.setFont("helvetica", "normal");
      pdf.text(invoice.receiverName, margin + 2, yPos + 12);
      const receiverAddressLines = invoice.receiverAddress.split("\n");
      receiverAddressLines.forEach((line, index) => {
        pdf.text(line, margin + 2, yPos + 16 + index * 3);
      });
      pdf.text(
        `GSTIN/UIN: ${invoice.receiverGST || "N/A"}`,
        margin + 2,
        yPos + 26
      );

      // Buyer
      pdf.setFont("helvetica", "bold");
      pdf.text("Buyer (Bill to)", margin + contentWidth / 2 + 2, yPos + 6);
      pdf.setFont("helvetica", "normal");
      pdf.text(invoice.receiverName, margin + contentWidth / 2 + 2, yPos + 12);
      receiverAddressLines.forEach((line, index) => {
        pdf.text(line, margin + contentWidth / 2 + 2, yPos + 16 + index * 3);
      });
      pdf.text(
        `GSTIN/UIN: ${invoice.receiverGST || "N/A"}`,
        margin + contentWidth / 2 + 2,
        yPos + 26
      );

      yPos += 35;

      // Items Table
      const tableHeaders = [
        "Sl",
        "Description of Goods",
        "HSN/SAC",
        "Quantity",
        "Rate",
        "Per",
        "Disc %",
        "Amount",
      ];
      const colWidths = [15, 60, 25, 20, 20, 15, 15, 30];

      // Table header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos, contentWidth, 10, "F");

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      let xPos = margin;
      tableHeaders.forEach((header, index) => {
        pdf.text(header, xPos + 1, yPos + 7);
        pdf.line(xPos, yPos, xPos, yPos + 10);
        xPos += colWidths[index];
      });
      pdf.line(xPos, yPos, xPos, yPos + 10);
      pdf.line(margin, yPos + 10, margin + contentWidth, yPos + 10);

      yPos += 10;

      // Table rows
      pdf.setFont("helvetica", "normal");
      invoice.items.forEach((item, index) => {
        const rowHeight = 8;
        xPos = margin;

        // Draw row data
        pdf.text((index + 1).toString(), xPos + 1, yPos + 5);
        xPos += colWidths[0];

        pdf.text(item.productName, xPos + 1, yPos + 5);
        xPos += colWidths[1];

        pdf.text(item.hsnCode || "69101000", xPos + 1, yPos + 5);
        xPos += colWidths[2];

        pdf.text(`${item.quantity} PCS`, xPos + 1, yPos + 5);
        xPos += colWidths[3];

        pdf.text(item.rate.toFixed(2), xPos + 1, yPos + 5);
        xPos += colWidths[4];

        pdf.text("PCS", xPos + 1, yPos + 5);
        xPos += colWidths[5];

        pdf.text(`${item.discount}%`, xPos + 1, yPos + 5);
        xPos += colWidths[6];

        pdf.text(formatCurrency(item.amount), xPos + 1, yPos + 5);

        // Draw borders
        xPos = margin;
        colWidths.forEach((width) => {
          pdf.line(xPos, yPos, xPos, yPos + rowHeight);
          xPos += width;
        });
        pdf.line(xPos, yPos, xPos, yPos + rowHeight);
        pdf.line(
          margin,
          yPos + rowHeight,
          margin + contentWidth,
          yPos + rowHeight
        );

        yPos += rowHeight;
      });

      // Tax calculations
      const cgstAmount = invoice.gstAmount / 2;
      const sgstAmount = invoice.gstAmount / 2;

      // CGST row
      xPos = margin;
      for (let i = 0; i < 6; i++) xPos += colWidths[i];
      pdf.text("Output CGST 9%", margin + 2, yPos + 5);
      pdf.text("9%", xPos + 1, yPos + 5);
      xPos += colWidths[6];
      pdf.text(formatCurrency(cgstAmount), xPos + 1, yPos + 5);

      // Draw borders for CGST row
      xPos = margin;
      colWidths.forEach((width) => {
        pdf.line(xPos, yPos, xPos, yPos + 8);
        xPos += width;
      });
      pdf.line(xPos, yPos, xPos, yPos + 8);
      pdf.line(margin, yPos + 8, margin + contentWidth, yPos + 8);
      yPos += 8;

      // SGST row
      xPos = margin;
      for (let i = 0; i < 6; i++) xPos += colWidths[i];
      pdf.text("Output SGST 9%", margin + 2, yPos + 5);
      pdf.text("9%", xPos + 1, yPos + 5);
      xPos += colWidths[6];
      pdf.text(formatCurrency(sgstAmount), xPos + 1, yPos + 5);

      // Draw borders for SGST row
      xPos = margin;
      colWidths.forEach((width) => {
        pdf.line(xPos, yPos, xPos, yPos + 8);
        xPos += width;
      });
      pdf.line(xPos, yPos, xPos, yPos + 8);
      pdf.line(margin, yPos + 8, margin + contentWidth, yPos + 8);
      yPos += 8;

      // Round off row
      pdf.text("ROUND OFF", margin + 2, yPos + 5);
      xPos = margin;
      for (let i = 0; i < 7; i++) xPos += colWidths[i];
      pdf.text("0.40", xPos + 1, yPos + 5);

      // Draw borders for round off row
      xPos = margin;
      colWidths.forEach((width) => {
        pdf.line(xPos, yPos, xPos, yPos + 8);
        xPos += width;
      });
      pdf.line(xPos, yPos, xPos, yPos + 8);
      pdf.line(margin, yPos + 8, margin + contentWidth, yPos + 8);
      yPos += 8;

      // Total row
      pdf.setFont("helvetica", "bold");
      pdf.text("Total", margin + 2, yPos + 5);
      xPos = margin;
      for (let i = 0; i < 7; i++) xPos += colWidths[i];
      pdf.text(`Rs ${formatCurrency(invoice.totalAmount)}`, xPos + 1, yPos + 5);

      // Draw borders for total row
      xPos = margin;
      colWidths.forEach((width) => {
        pdf.line(xPos, yPos, xPos, yPos + 8);
        xPos += width;
      });
      pdf.line(xPos, yPos, xPos, yPos + 8);
      pdf.line(margin, yPos + 8, margin + contentWidth, yPos + 8);

      yPos += 15;

      // Amount in words
      pdf.setFont("helvetica", "normal");
      const amountInWords =
        invoice.totalAmountInWords ||
        `${numberToWords(Math.floor(invoice.totalAmount))} Rupees Only`;
      pdf.text(`Amount Chargeable (in words): ${amountInWords}`, margin, yPos);

      yPos += 10;

      // Tax breakdown table
      pdf.setFontSize(7);
      const taxTableHeaders = [
        "HSN/SAC",
        "Taxable Value",
        "Central Tax Rate",
        "Amount",
        "State Tax Rate",
        "Amount",
        "Total Tax Amount",
      ];
      const taxColWidths = [25, 30, 25, 25, 25, 25, 35];

      // Tax table header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos, contentWidth, 8, "F");

      xPos = margin;
      taxTableHeaders.forEach((header, index) => {
        pdf.text(header, xPos + 1, yPos + 5);
        pdf.line(xPos, yPos, xPos, yPos + 8);
        xPos += taxColWidths[index];
      });
      pdf.line(xPos, yPos, xPos, yPos + 8);
      pdf.line(margin, yPos + 8, margin + contentWidth, yPos + 8);

      yPos += 8;

      // Tax table data row
      xPos = margin;
      pdf.text("69101000", xPos + 1, yPos + 5);
      xPos += taxColWidths[0];
      pdf.text(formatCurrency(invoice.subtotal), xPos + 1, yPos + 5);
      xPos += taxColWidths[1];
      pdf.text("9%", xPos + 1, yPos + 5);
      xPos += taxColWidths[2];
      pdf.text(formatCurrency(cgstAmount), xPos + 1, yPos + 5);
      xPos += taxColWidths[3];
      pdf.text("9%", xPos + 1, yPos + 5);
      xPos += taxColWidths[4];
      pdf.text(formatCurrency(sgstAmount), xPos + 1, yPos + 5);
      xPos += taxColWidths[5];
      pdf.text(formatCurrency(invoice.gstAmount), xPos + 1, yPos + 5);

      // Draw borders for tax data row
      xPos = margin;
      taxColWidths.forEach((width) => {
        pdf.line(xPos, yPos, xPos, yPos + 8);
        xPos += width;
      });
      pdf.line(xPos, yPos, xPos, yPos + 8);
      pdf.line(margin, yPos + 8, margin + contentWidth, yPos + 8);

      yPos += 8;

      // Tax total row
      pdf.setFont("helvetica", "bold");
      xPos = margin;
      pdf.text("Total", xPos + 1, yPos + 5);
      xPos += taxColWidths[0];
      pdf.text(formatCurrency(invoice.subtotal), xPos + 1, yPos + 5);
      xPos += taxColWidths[1] + taxColWidths[2];
      pdf.text(formatCurrency(cgstAmount), xPos + 1, yPos + 5);
      xPos += taxColWidths[3] + taxColWidths[4];
      pdf.text(formatCurrency(sgstAmount), xPos + 1, yPos + 5);
      xPos += taxColWidths[5];
      pdf.text(formatCurrency(invoice.gstAmount), xPos + 1, yPos + 5);

      // Draw borders for tax total row
      xPos = margin;
      taxColWidths.forEach((width) => {
        pdf.line(xPos, yPos, xPos, yPos + 8);
        xPos += width;
      });
      pdf.line(xPos, yPos, xPos, yPos + 8);
      pdf.line(margin, yPos + 8, margin + contentWidth, yPos + 8);

      yPos += 15;

      // Tax amount in words
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const taxAmountInWords = `${numberToWords(
        Math.floor(invoice.gstAmount)
      )} Rupees Only`;
      pdf.text(`Tax Amount (in words): ${taxAmountInWords}`, margin, yPos);

      yPos += 10;

      // Company's PAN and Declaration
      pdf.text("Company's PAN: AAACR1234C", margin, yPos);

      yPos += 8;
      pdf.text("Declaration:", margin, yPos);
      pdf.text(
        "We declare that this invoice shows the actual price",
        margin,
        yPos + 4
      );
      pdf.text(
        "of the goods described and that all particulars are",
        margin,
        yPos + 8
      );
      pdf.text("true and correct.", margin, yPos + 12);

      // Signature section
      pdf.text(`for ${invoice.senderName}`, margin + 120, yPos);
      pdf.text("Authorised Signatory", margin + 120, yPos + 20);

      // Footer
      pdf.setFontSize(7);
      pdf.text("This is a Computer Generated Invoice", margin, 280);

      pdf.save(`Tax-Invoice-${invoice.invoiceNumber || params.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(
        `Failed to generate PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsPdfGenerating(false);
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
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="mr-4 rounded-md bg-white p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold leading-7 text-gray-900">
                Tax Invoice #{invoice.invoiceNumber}
              </h1>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {formatDate(invoice.date)} •{" "}
                <StatusBadge status={invoice.status} />
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3 sm:mt-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              <DocumentArrowDownIcon
                className="-ml-0.5 mr-1.5 h-5 w-5"
                aria-hidden="true"
              />
              {isPdfGenerating ? "Generating..." : "Download Tax Invoice PDF"}
            </button>
          </div>
        </div>

        {/* Invoice Content - Traditional Indian GST Format */}
        <div
          ref={invoiceRef}
          className="bg-white shadow-lg rounded-lg overflow-hidden"
        >
          {/* Header Section */}
          <div className="flex border-b-2 border-gray-900 bg-white px-6 py-4 justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tax Invoice</h1>
              <p className="text-sm text-gray-600">(ORIGINAL FOR RECIPIENT)</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold mb-2">e-Invoice</div>
              <div className="w-20 h-20 bg-gray-200 border border-gray-400 flex items-center justify-center">
                <span className="text-xs text-gray-500">QR Code</span>
              </div>
            </div>
          </div>

          {/* IRN and Invoice Details */}
          <div className="flex justify-between items-center text-sm  border-b border-gray-400 px-6 py-3 bg-gray-50">
            <div>
              <strong>Invoice No. - </strong> {invoice.invoiceNumber}
            </div>
            <div>
              <strong>Dated:</strong> {formatDate(invoice.date)}
            </div>
          </div>

          {/* Consignee and Buyer Details */}
          <div className="border-b border-gray-400">
            <div className="grid grid-cols-2">
              {/* Company Details */}
              <div className="px-4 py-4 border-r">
                <h3 className="font-bold text-sm mb-2">Seller (Bill From)</h3>
                <div className="text-sm text-gray-700">
                  <p className="font-medium">{invoice.senderName}</p>
                  <p className="whitespace-pre-line mb-2">
                    {invoice.senderAddress}
                  </p>
                  <p>
                    <strong>GSTIN/UIN:</strong> {invoice.senderGST || "N/A"}
                  </p>
                  <p>
                    <strong>State Name:</strong>{" "}
                    {invoice.senderState || "N/A"}
                  </p>
                  <p>
                    <strong>Contact:</strong>{" "}
                    {invoice.senderContact || "N/A"}
                  </p>
                </div>
              </div>
              {/* Reciever Details */}
              <div className="px-4 py-4">
                <h3 className="font-bold text-sm mb-2">Buyer (Bill to)</h3>
                <div className="text-sm text-gray-700">
                  <p className="font-medium">{invoice.receiverName}</p>
                  <p className="whitespace-pre-line mb-2">
                    {invoice.receiverAddress}
                  </p>
                  <p>
                    <strong>GSTIN/UIN:</strong> {invoice.receiverGST || "N/A"}
                  </p>
                  <p>
                    <strong>State Name:</strong>{" "}
                    {invoice.receiverState || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-b border-gray-400">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-400">
                  <th className="border-r border-gray-400 pl-4 px-2 py-2 text-left font-medium text-gray-900">
                    Sl
                  </th>
                  <th className="border-r border-gray-400 px-2 py-2 text-left font-medium text-gray-900">
                    Description of Goods
                  </th>
                  <th className="border-r border-gray-400 px-2 py-2 text-center font-medium text-gray-900">
                    HSN/SAC
                  </th>
                  <th className="border-r border-gray-400 px-2 py-2 text-center font-medium text-gray-900">
                    Quantity
                  </th>
                  <th className="border-r border-gray-400 px-2 py-2 text-center font-medium text-gray-900">
                    Rate
                  </th>
                  <th className="border-r border-gray-400 px-2 py-2 text-center font-medium text-gray-900">
                    Per
                  </th>
                  <th className="border-r border-gray-400 px-2 py-2 text-center font-medium text-gray-900">
                    Disc %
                  </th>
                  <th className="pr-4 px-2 py-2 text-right font-medium text-gray-900">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr
                    key={item.id || item.serialNumber}
                    className="border-b border-gray-300"
                  >
                    <td className="border-r border-gray-300 pl-4 px-2 py-2">
                      {index + 1}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-2">
                      {item.productName}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-2 text-center">
                      {item.hsnCode || "69101000"}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-2 text-center">
                      {item.quantity} PCS
                    </td>
                    <td className="border-r border-gray-300 px-2 py-2 text-center">
                      {item.rate.toFixed(2)}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-2 text-center">
                      PCS
                    </td>
                    <td className="border-r border-gray-300 px-2 py-2 text-center">
                      {item.discount}%
                    </td>
                    <td className="px-2 py-2 pr-4 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}

                {/* Tax Summary Rows */}
                <tr className="border-b border-gray-300">
                  <td colSpan={6} className="px-2 pl-4 py-2 font-medium">
                    Output CGST
                  </td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center">
                    {invoice.cgstRate}
                  </td>
                  <td className="px-2 py-2 pr-4 text-right">
                    {formatCurrency(invoice.gstAmount / 2)}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td colSpan={6} className="px-2 pl-4 py-2 font-medium">
                    Output SGST
                  </td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center">
                    {invoice.sgstRate}
                  </td>
                  <td className="px-2 py-2 pr-4 text-right">
                    {formatCurrency(invoice.gstAmount / 2)}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td colSpan={7} className="px-2 pl-4 py-2 font-medium">
                    ROUND OFF
                  </td>
                  <td className="px-2 py-2 pr-4 text-right">{formatCurrency(invoice.roundOffAmount)}</td>
                </tr>
                <tr className="border-b-2 border-gray-900">
                  <td colSpan={7} className="px-2 pl-4 py-2 font-bold">
                    Total
                  </td>
                  <td className="px-2 py-2 pr-4 text-right font-bold">
                    Rs {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="border-b border-gray-400 px-4 py-3">
            <p className="text-sm">
              <span className="font-medium">Amount Chargeable (in words):</span>{" "}
              <span className="font-bold">
                {invoice.totalAmountInWords ||
                  `${numberToWords(
                    Math.floor(invoice.totalAmount)
                  )} Rupees Only`}
              </span>
            </p>
          </div>

          {/* Tax Breakdown Table */}
          <div className="border-b border-gray-400 px-4 py-3">
            <table className="min-w-full text-xs border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left">
                    HSN/SAC
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center">
                    Taxable Value
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center">
                    Central Tax Rate
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center">
                    Amount
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center">
                    State Tax Rate
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center">
                    Amount
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center">
                    Total Tax Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">69101000</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {invoice.cgstRate}%
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.gstAmount / 2)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {invoice.sgstRate}%
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.gstAmount / 2)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.gstAmount)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-gray-300 px-2 py-1">Total</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.gstAmount / 2)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.gstAmount / 2)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {formatCurrency(invoice.gstAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Amount in Words */}
          <div className="border-b border-gray-400 px-4 py-3">
            <p className="text-sm">
              <span className="font-medium">Tax Amount (in words):</span>{" "}
              <span className="font-bold">
                {numberToWords(Math.floor(invoice.gstAmount))} Rupees Only
              </span>
            </p>
          </div>

          {/* Footer Section */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-sm">
                  <span className="font-medium">Company's Bank Details</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Bank Name:</span> UCO BANK
                </p>
                <p className="text-sm">
                  <span className="font-medium">A/c No.:</span> XXXXXXXXXX
                </p>
                <p className="text-sm">
                  <span className="font-medium">Branch & IFS Code:</span> MAHOBA
                  CHARKHARI 0316
                </p>
                <div className="mt-4">
                  <p className="text-sm">
                    <span className="font-medium">Company's PAN:</span>{" "}
                    AAACR1234C
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium">Declaration:</p>
                  <p className="text-xs text-gray-600 mt-1">
                    We declare that this invoice shows the actual price
                    <br />
                    of the goods described and that all particulars are
                    <br />
                    true and correct.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm">for {invoice.senderName}</p>
                <div className="mt-8 mb-2">
                  <div className="w-24 h-16 border border-gray-400 ml-auto flex items-center justify-center">
                    <span className="text-xs text-gray-500">Signature</span>
                  </div>
                </div>
                <p className="text-sm">Authorised Signatory</p>
                <p className="text-sm">Name:</p>
                <p className="text-sm">Designation:</p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                This is a Computer Generated Invoice
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
