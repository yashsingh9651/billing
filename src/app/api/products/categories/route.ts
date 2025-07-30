import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/app/auth';

// GET /api/products/categories - Get all product categories
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get categories with product count
    const categories = await prisma.productCategory.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // If no categories exist, migrate existing product categories
    if (categories.length === 0) {
      const products = await prisma.product.findMany({
        select: {
          category: true,
        },
        distinct: ['category'],
      });
      
      // Create categories from existing product categories
      if (products.length > 0) {
        const categoryData = products.map(product => ({
          name: product.category,
        }));
        
        // Create categories
        await Promise.all(
          categoryData.map(async (cat) => {
            return prisma.productCategory.create({
              data: cat,
            });
          })
        );
        
        // Fetch the newly created categories
        const newCategories = await prisma.productCategory.findMany({
          include: {
            _count: {
              select: { products: true },
            },
          },
          orderBy: {
            name: 'asc',
          },
        });
        
        return NextResponse.json({ categories: newCategories });
      }
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/products/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existingCategory = await prisma.productCategory.findUnique({
      where: { name },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    // Create new category
    const category = await prisma.productCategory.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
