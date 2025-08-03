import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            serialNumber: "asc",
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    // Check if invoice exists and belongs to the user
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // If we're updating items, we need to delete existing items and create new ones
    if (data.items) {
      // Calculate new totals
      const subtotal = data.items.reduce(
        (sum: number, item: any) => sum + item.amount,
        0
      );
      const gstRate = 0.18; // 18% GST (9% SGST + 9% IGST)
      const gstAmount = subtotal * gstRate;
      const sgstAmount = gstAmount / 2;
      const igstAmount = gstAmount / 2;
      const totalAmount = subtotal + gstAmount;

      // Convert total to words (simplified)
      function numberToWords(num: number) {
        const units = [
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
          "",
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
          "Ten",
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

        const convertLessThanOneThousand = (num: number) => {
          let result = "";
          if (num >= 100) {
            result += units[Math.floor(num / 100)] + " Hundred ";
            num %= 100;
          }
          if (num >= 11 && num <= 19) {
            result += teens[num - 10];
          } else {
            result += tens[Math.floor(num / 10)];
            if (Math.floor(num / 10) > 0 && num % 10 > 0) {
              result += " ";
            }
            result += units[num % 10];
          }
          return result;
        };

        let result = "";
        if (num >= 100000) {
          result +=
            convertLessThanOneThousand(Math.floor(num / 100000)) + " Lakh ";
          num %= 100000;
        }
        if (num >= 1000) {
          result +=
            convertLessThanOneThousand(Math.floor(num / 1000)) + " Thousand ";
          num %= 1000;
        }
        result += convertLessThanOneThousand(num);

        return result.trim();
      }

      const totalAmountInWords = `${numberToWords(
        Math.floor(totalAmount)
      )} Rupees Only`;

      // Delete existing items
      await prisma.invoiceItem.deleteMany({
        where: {
          invoiceId: id,
        },
      });

      // Update invoice with new items and totals
      const updatedInvoice = await prisma.invoice.update({
        where: {
          id,
        },
        data: {
          date: data.date || undefined,
          type: data.type || undefined,

          // Update sender details only if it's a BUYING invoice (for SELLING, use user business details)
          ...(data.type !== "SELLING"
            ? {
                senderName: data.senderName || undefined,
                senderAddress: data.senderAddress || undefined,
                senderGST: data.senderGST || undefined,
                senderContact: data.senderContact || undefined,
              }
            : {
                senderName: session.user.businessName,
                senderAddress: session.user.businessAddress,
                senderGST: session.user.businessGST,
                senderContact: session.user.businessContact,
              }),

          // Update receiver details only if it's a SELLING invoice (for BUYING, use user business details)
          ...(data.type !== "BUYING"
            ? {
                receiverName: data.receiverName || undefined,
                receiverAddress: data.receiverAddress || undefined,
                receiverGST: data.receiverGST || undefined,
                receiverContact: data.receiverContact || undefined,
              }
            : {
                receiverName: session.user.businessName,
                receiverAddress: session.user.businessAddress,
                receiverGST: session.user.businessGST,
                receiverContact: session.user.businessContact,
              }),

          subtotal,
          cgstRate: data.cgstRate !== undefined ? data.cgstRate : 0,
          sgstRate: data.sgstRate !== undefined ? data.sgstRate : 0,
          igstRate: data.igstRate !== undefined ? data.igstRate : 0,
          notes: data.notes || undefined,

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
          items: {
            include: {
              product: true,
            },
            orderBy: {
              serialNumber: "asc",
            },
          },
        },
      });

      return NextResponse.json(updatedInvoice);
    } else {
      // Simple update without changing items
      const updatedInvoice = await prisma.invoice.update({
        where: {
          id,
        },
        data: {
          date: data.date || undefined,
          notes: data.notes || undefined,
        },
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: {
              serialNumber: "asc",
            },
          },
        },
      });

      return NextResponse.json(updatedInvoice);
    }
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if invoice exists and belongs to the user
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Delete the invoice (this will also delete its items due to the onDelete: Cascade relation)
    await prisma.invoice.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
