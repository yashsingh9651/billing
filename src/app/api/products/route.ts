import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/app/auth';

// GET /api/products - Get all products
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering/pagination if needed
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const categoryId = searchParams.get('categoryId');
    const isActive = searchParams.get('isActive');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    // Build where condition based on query params
    const where: any = {};
    if (category) where.category = category;
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== null) where.isActive = isActive === 'true';

    // Get products with pagination and filtering
    const products = await prisma.product.findMany({
      where,
      take: limit,
      skip,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.product.count({ where });

    return NextResponse.json({
      products,
      totalCount,
      page: page || 1,
      limit: limit || totalCount,
      totalPages: limit ? Math.ceil(totalCount / limit) : 1,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get product data from request body
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'name', 'quantity', 'buyingPrice', 'sellingPrice', 'wholesalePrice',
      'mrp', 'unit', 'category', 'supplier', 'taxRate'
    ];
    
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Ensure numeric values are parsed as numbers
    const numericFields = ['quantity', 'buyingPrice', 'sellingPrice', 'wholesalePrice', 
                          'discountPercentage', 'mrp', 'taxRate'];
    
    numericFields.forEach(field => {
      if (body[field] !== undefined) {
        body[field] = parseFloat(body[field]);
      }
    });

    // Create new product
    const product = await prisma.product.create({
      data: {
        name: body.name,
        quantity: body.quantity,
        buyingPrice: body.buyingPrice,
        sellingPrice: body.sellingPrice,
        wholesalePrice: body.wholesalePrice,
        discountPercentage: body.discountPercentage || 0,
        mrp: body.mrp,
        unit: body.unit,
        category: body.category,
        categoryId: body.categoryId || null,
        barcode: body.barcode,
        supplier: body.supplier,
        taxRate: body.taxRate,
        description: body.description,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
