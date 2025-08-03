import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user ID from the session
    const userId = session.user.id;
    
    // Get current date information for month comparisons
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate first day of current and previous month
    const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
    const firstDayPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayPreviousMonth = new Date(currentYear, currentMonth, 0);

    // Use Promise.all to run queries concurrently for better performance
    const [
      totalProductsCount,
      totalInvoicesCount,
      lowStockCount,
      totalReceived,
      currentMonthReceived,
      previousMonthReceived,
      totalSpent,
      currentMonthSpent,
      previousMonthSpent,
      currentMonthInvoicesCount,
      previousMonthInvoicesCount,
      recentInvoices
    ] = await Promise.all([
      // Get total counts
      prisma.product.count(),
      
      prisma.invoice.count({
        where: { userId },
      }),
      
      // Get low stock items count (products with quantity less than 5)
      prisma.product.count({
        where: { 
          quantity: { lt: 5 } 
        },
      }),
      
      // Calculate total amount received (from SELLING invoices with PAID status)
      prisma.invoice.aggregate({
        where: {
          userId,
          type: "SELLING",
          status: "PAID"
        },
        _sum: {
          subtotal: true
        }
      }),
      
      // Calculate current month's received amount
      prisma.invoice.aggregate({
        where: {
          userId,
          type: "SELLING",
          date: { gte: firstDayCurrentMonth }
        },
        _sum: {
          subtotal: true
        }
      }),
      
      // Calculate previous month's received amount
      prisma.invoice.aggregate({
        where: {
          userId,
          type: "SELLING",
          date: { 
            gte: firstDayPreviousMonth,
            lt: firstDayCurrentMonth
          }
        },
        _sum: {
          subtotal: true
        }
      }),
      
      // Calculate total amount spent (from BUYING invoices with PAID status)
      prisma.invoice.aggregate({
        where: {
          userId,
          type: "BUYING",
          status: "PAID"
        },
        _sum: {
          subtotal: true
        }
      }),
      
      // Calculate current month's spent amount
      prisma.invoice.aggregate({
        where: {
          userId,
          type: "BUYING",
          date: { gte: firstDayCurrentMonth }
        },
        _sum: {
          subtotal: true
        }
      }),
      
      // Calculate previous month's spent amount
      prisma.invoice.aggregate({
        where: {
          userId,
          type: "BUYING",
          date: { 
            gte: firstDayPreviousMonth,
            lt: firstDayCurrentMonth
          }
        },
        _sum: {
          subtotal: true
        }
      }),
      
      // Get current month invoices count
      prisma.invoice.count({
        where: { 
          userId,
          date: { gte: firstDayCurrentMonth }
        },
      }),
      
      // Get previous month invoices count
      prisma.invoice.count({
        where: { 
          userId,
          date: { 
            gte: firstDayPreviousMonth,
            lt: firstDayCurrentMonth
          }
        },
      }),
      
      // Get recent activity (last 5 invoices)
      prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          status: true,
          subtotal: true,
          createdAt: true,
          receiverName: true,
          senderName: true,
        }
      })
    ]);

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Calculate percentage changes for each metric
    const salesChange = calculatePercentageChange(
      currentMonthReceived._sum.subtotal || 0, 
      previousMonthReceived._sum.subtotal || 0
    );
    
    const spentChange = calculatePercentageChange(
      currentMonthSpent._sum.subtotal || 0, 
      previousMonthSpent._sum.subtotal || 0
    );
    
    const invoicesChange = calculatePercentageChange(
      currentMonthInvoicesCount, 
      previousMonthInvoicesCount
    );
    
    // For products and low stock, we'll use a simpler approach since we don't track monthly changes
    const productsChange = 5; // Static for now, would ideally be calculated from history
    const lowStockChange = 2; // Static for now, would ideally be calculated from history

    // Format the data for response
    const dashboardData = {
      totalProducts: totalProductsCount,
      totalInvoices: totalInvoicesCount,
      lowStockItems: lowStockCount,
      totalAmountReceived: totalReceived._sum.subtotal || 0,
      totalAmountSpent: totalSpent._sum.subtotal || 0,
      
      // Add percentage changes
      salesChange,
      salesChangeType: salesChange >= 0 ? 'increase' : 'decrease',
      spentChange: Math.abs(spentChange),
      spentChangeType: spentChange >= 0 ? 'increase' : 'decrease',
      invoicesChange,
      invoicesChangeType: invoicesChange >= 0 ? 'increase' : 'decrease',
      productsChange,
      productsChangeType: 'increase',
      lowStockChange,
      lowStockChangeType: 'decrease',
      
      recentActivity: recentInvoices.map(invoice => ({
        id: invoice.id,
        type: 'invoice',
        title: `Invoice #${invoice.invoiceNumber} ${invoice.status.toLowerCase()}`,
        date: new Date(invoice.createdAt).toLocaleDateString(),
        amount: invoice.subtotal,
        invoiceType: invoice.type,
        partyName: invoice.type === 'SELLING' ? invoice.receiverName : invoice.senderName
      }))
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Dashboard statistics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
