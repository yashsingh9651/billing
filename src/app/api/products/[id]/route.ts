import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/auth";

type RouteSegmentProps = {
  params: {
    id: string;
  };
};

// GET /api/products/[id] - Get a specific product by ID
export async function GET(request: NextRequest, { params }: RouteSegmentProps) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get product by ID
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a specific product
export async function PUT(request: NextRequest, { params }: RouteSegmentProps) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get product data from request body
    const body = await request.json();

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Ensure numeric values are parsed as numbers
    const numericFields = [
      "quantity",
      "buyingPrice",
      "sellingPrice",
      "wholesalePrice",
      "discountPercentage",
      "mrp",
      "taxRate",
    ];

    numericFields.forEach((field) => {
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
        buyingPrice:
          body.buyingPrice !== undefined ? body.buyingPrice : undefined,
        sellingPrice:
          body.sellingPrice !== undefined ? body.sellingPrice : undefined,
        wholesalePrice:
          body.wholesalePrice !== undefined ? body.wholesalePrice : undefined,
        discountPercentage:
          body.discountPercentage !== undefined
            ? body.discountPercentage
            : undefined,
        mrp: body.mrp !== undefined ? body.mrp : undefined,
        unit: body.unit !== undefined ? body.unit : undefined,
        barcode: body.barcode !== undefined ? body.barcode : undefined,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a specific product
export async function DELETE(
  request: NextRequest,
  { params }: RouteSegmentProps
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product is used in any invoices
    const invoiceItems = await prisma.invoiceItem.findFirst({
      where: { productId: id },
    });

    if (invoiceItems) {
      // Return an error if the product is used in invoices
      return NextResponse.json({
        error: "Cannot delete product because it is used in invoices",
        details: "This product is referenced in one or more invoices and cannot be deleted. Consider updating the quantity to zero instead.",
      }, { status: 400 });
    }

    // Delete product if not used in any invoices
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
