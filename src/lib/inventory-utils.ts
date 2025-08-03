import { prisma } from '@/lib/prisma';

/**
 * Updates product inventory quantities based on a buying invoice
 * @param invoiceId The ID of the buying invoice
 * @returns Object containing success status and message or error details
 */
export async function updateInventoryFromBuyingInvoice(invoiceId: string) {
  try {
    // Get the invoice with its items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return { success: false, message: 'Invoice not found' };
    }

    // Verify this is a buying invoice
    if (invoice.type !== 'BUYING') {
      return { success: false, message: 'Only buying invoices update inventory' };
    }

    // Process each item in the invoice
    const updateResults = await Promise.all(
      invoice.items.map(async (item) => {
        // Get current product data
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return {
            productId: item.productId,
            success: false,
            message: 'Product not found',
          };
        }

        // Update product quantity and potentially buying price
        const updatedProduct = await prisma.product.update({
          where: { id: item.productId },
          data: {
            // Increase product quantity by the purchased amount
            quantity: product.quantity + item.quantity,
            
            // Optionally update the buying price to the latest one
            // Note: This is optional and depends on business requirements
            buyingPrice: item.rate,
          },
        });

        return {
          productId: item.productId,
          success: true,
          oldQuantity: product.quantity,
          newQuantity: updatedProduct.quantity,
          quantityAdded: item.quantity,
        };
      })
    );

    return {
      success: true,
      message: 'Inventory updated successfully',
      results: updateResults,
      invoiceId,
    };
  } catch (error) {
    console.error('Error updating inventory:', error);
    return {
      success: false,
      message: 'Failed to update inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Updates product inventory quantities based on a selling invoice
 * @param invoiceId The ID of the selling invoice
 * @returns Object containing success status and message or error details
 */
export async function updateInventoryFromSellingInvoice(invoiceId: string) {
  try {
    // Get the invoice with its items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return { success: false, message: 'Invoice not found' };
    }

    // Verify this is a selling invoice
    if (invoice.type !== 'SELLING') {
      return { success: false, message: 'Only selling invoices can decrease inventory' };
    }

    // Process each item in the invoice
    const updateResults = await Promise.all(
      invoice.items.map(async (item) => {
        // Get current product data
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return {
            productId: item.productId,
            success: false,
            message: 'Product not found',
          };
        }

        // Check if there's enough quantity available
        if (product.quantity < item.quantity) {
          return {
            productId: item.productId,
            success: false,
            message: `Insufficient inventory. Available: ${product.quantity}, Requested: ${item.quantity}`,
          };
        }

        // Update product quantity - decrease the quantity
        const updatedProduct = await prisma.product.update({
          where: { id: item.productId },
          data: {
            // Decrease product quantity by the sold amount
            quantity: product.quantity - item.quantity,
          },
        });

        return {
          productId: item.productId,
          success: true,
          oldQuantity: product.quantity,
          newQuantity: updatedProduct.quantity,
          quantityRemoved: item.quantity,
        };
      })
    );

    // Check if any item failed due to insufficient inventory
    const hasInsufficientInventory = updateResults.some(result => !result.success && result.message?.includes('Insufficient inventory'));

    return {
      success: !hasInsufficientInventory,
      message: hasInsufficientInventory 
        ? 'Some products have insufficient inventory' 
        : 'Inventory updated successfully',
      results: updateResults,
      invoiceId,
    };
  } catch (error) {
    console.error('Error updating inventory:', error);
    return {
      success: false,
      message: 'Failed to update inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
