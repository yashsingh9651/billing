import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';
import { 
  updateInventoryFromBuyingInvoice,
  updateInventoryFromSellingInvoice 
} from '@/lib/inventory-utils';

// PUT /api/invoices/[id]/update-inventory - Update inventory for an invoice
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Get invoice to check its type
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Process inventory update based on invoice type
    let result;
    
    if (invoice.type === 'BUYING') {
      result = await updateInventoryFromBuyingInvoice(id);
    } else if (invoice.type === 'SELLING') {
      result = await updateInventoryFromSellingInvoice(id);
    } else {
      return NextResponse.json({ 
        error: 'Unknown invoice type' 
      }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to update inventory', 
        details: result.message
      }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
