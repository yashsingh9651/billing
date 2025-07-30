import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';
import { 
  updateInventoryFromBuyingInvoice,
  updateInventoryFromSellingInvoice 
} from '@/lib/inventory-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    // Build the query with filters
    const where: any = {
      userId: session.user.id,
    };
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }
    
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    
    // Validate required fields
    const requiredFields = [
      'type', 'senderName', 'senderAddress', 'senderContact',
      'receiverName', 'receiverAddress', 'receiverContact', 'items'
    ];
    
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Failed to create invoice',
        details: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
    
    // Validate items array
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({
        error: 'Failed to create invoice',
        details: 'At least one item is required'
      }, { status: 400 });
    }
    
    // Validate each item has required fields
    const requiredItemFields = ['productId', 'productName', 'quantity', 'rate', 'amount'];
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const missingItemFields = requiredItemFields.filter(field => item[field] === undefined);
      if (missingItemFields.length > 0) {
        return NextResponse.json({
          error: 'Failed to create invoice',
          details: `Item at index ${i} is missing required fields: ${missingItemFields.join(', ')}`
        }, { status: 400 });
      }
    }
    
    // Generate a unique invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        type: data.type,
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });
    
    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumberStr = lastInvoice.invoiceNumber.split('-')[1];
      const lastNumber = parseInt(lastNumberStr);
      nextNumber = lastNumber + 1;
    }
    
    const prefix = data.type === 'BUYING' ? 'BIL' : 'SIL';
    const invoiceNumber = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
    
    // Calculate totals
    const subtotal = data.items.reduce((sum: number, item: any) => sum + item.amount, 0);
    
    // Use tax rates from the frontend or default to 18% total
    const cgstRate = data.cgstRate !== undefined ? data.cgstRate / 100 : 0.09; // Convert from percentage
    const sgstRate = data.sgstRate !== undefined ? data.sgstRate / 100 : 0.09; // Convert from percentage
    const igstRate = data.igstRate !== undefined ? data.igstRate / 100 : 0; // Convert from percentage
    
    const sgstAmount = subtotal * sgstRate;
    const cgstAmount = subtotal * cgstRate;
    const igstAmount = subtotal * igstRate;
    const gstAmount = sgstAmount + cgstAmount + igstAmount;
    const totalAmount = subtotal + gstAmount;
    
    // Convert total to words (simplified)
    function numberToWords(num: number) {
      const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      if (num === 0) return 'Zero';
      
      const convertLessThanOneThousand = (num: number) => {
        let result = '';
        if (num >= 100) {
          result += units[Math.floor(num / 100)] + ' Hundred ';
          num %= 100;
        }
        if (num >= 11 && num <= 19) {
          result += teens[num - 10];
        } else {
          result += tens[Math.floor(num / 10)];
          if (Math.floor(num / 10) > 0 && num % 10 > 0) {
            result += ' ';
          }
          result += units[num % 10];
        }
        return result;
      };
      
      let result = '';
      if (num >= 100000) {
        result += convertLessThanOneThousand(Math.floor(num / 100000)) + ' Lakh ';
        num %= 100000;
      }
      if (num >= 1000) {
        result += convertLessThanOneThousand(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
      }
      result += convertLessThanOneThousand(num);
      
      return result.trim();
    }
    
    const totalAmountInWords = `${numberToWords(Math.floor(totalAmount))} Rupees Only`;
    
    // Create the invoice and its items
    try {
      // First, verify that all products exist
      for (const item of data.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        
        if (!product) {
          return NextResponse.json({ 
            error: 'Failed to create invoice', 
            details: `Product with ID ${item.productId} not found` 
          }, { status: 400 });
        }
      }
      
      const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        date: data.date ? new Date(data.date) : new Date(),
        type: data.type,
        
        senderName: data.senderName,
        senderAddress: data.senderAddress,
        senderGST: data.senderGST,
        senderContact: data.senderContact,
        
        receiverName: data.receiverName,
        receiverAddress: data.receiverAddress,
        receiverGST: data.receiverGST,
        receiverContact: data.receiverContact,
        
        subtotal,
        gstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        totalAmountInWords,
        
        status: 'DRAFT',
        notes: data.notes,
        
        userId: session.user.id,
        
        items: {
          create: data.items.map((item: any, index: number) => ({
            serialNumber: index + 1,
            productName: item.productName,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount || 0,
            amount: item.amount,
            productId: item.productId,
          })),
        },
      },
      include: {
        items: true,
      },
    });
    
    // Update product inventory quantities based on invoice type
    let inventoryUpdateResult = null;
    
    // Handle inventory updates if requested
    if (data.updateInventory !== false) {
      if (data.type === 'BUYING') {
        // For buying invoices, increase inventory
        inventoryUpdateResult = await updateInventoryFromBuyingInvoice(invoice.id);
      } else if (data.type === 'SELLING') {
        // For selling invoices, decrease inventory
        inventoryUpdateResult = await updateInventoryFromSellingInvoice(invoice.id);
      }
      
      // If inventory update failed, log the error but still return the invoice
      if (inventoryUpdateResult && !inventoryUpdateResult.success) {
        console.error('Inventory update failed:', inventoryUpdateResult.message);
      }
    }
    
    return NextResponse.json({
      ...invoice,
      inventoryUpdate: inventoryUpdateResult
    });
    } catch (innerError) {
      console.error('Error during invoice creation:', innerError);
      const errorMessage = innerError instanceof Error ? innerError.message : 'Failed during invoice creation';
      return NextResponse.json({ 
        error: 'Failed to create invoice',
        details: errorMessage
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    // Send back more detailed error message if available
    const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice';
    return NextResponse.json({ 
      error: 'Failed to create invoice',
      details: errorMessage
    }, { status: 500 });
  }
}
