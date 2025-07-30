import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/app/auth';

// GET /api/products/[id] - Get a specific product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Get product by ID
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productCategory: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a specific product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Get product data from request body
    const body = await request.json();

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Ensure numeric values are parsed as numbers
    const numericFields = ['quantity', 'buyingPrice', 'sellingPrice', 'wholesalePrice', 
                          'discountPercentage', 'mrp', 'taxRate'];
    
    numericFields.forEach(field => {
      if (body[field] !== undefined) {
        body[field] = parseFloat(body[field]);
      }
    });

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        quantity: body.quantity !== undefined ? body.quantity : undefined,
        buyingPrice: body.buyingPrice !== undefined ? body.buyingPrice : undefined,
        sellingPrice: body.sellingPrice !== undefined ? body.sellingPrice : undefined,
        wholesalePrice: body.wholesalePrice !== undefined ? body.wholesalePrice : undefined,
        discountPercentage: body.discountPercentage !== undefined ? body.discountPercentage : undefined,
        mrp: body.mrp !== undefined ? body.mrp : undefined,
        unit: body.unit !== undefined ? body.unit : undefined,
        category: body.category !== undefined ? body.category : undefined,
        categoryId: body.categoryId !== undefined ? body.categoryId : undefined,
        barcode: body.barcode !== undefined ? body.barcode : undefined,
        supplier: body.supplier !== undefined ? body.supplier : undefined,
        taxRate: body.taxRate !== undefined ? body.taxRate : undefined,
        description: body.description !== undefined ? body.description : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a specific product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product is used in any invoices
    const invoiceItems = await prisma.invoiceItem.findFirst({
      where: { productId: id },
    });

    if (invoiceItems) {
      // Instead of hard delete, soft delete by marking as inactive
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      
      return NextResponse.json({
        ...updatedProduct,
        message: 'Product marked as inactive because it is used in invoices',
      });
    }

    // Delete product if not used in any invoices
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
