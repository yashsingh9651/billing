// seed.js - Using JS extension to avoid TS compilation issues
const { PrismaClient } = require('../src/generated/prisma');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Check if the superadmin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: 'SUPERADMIN',
    },
  });

  if (!existingSuperAdmin) {
    // Create a superadmin user
    const hashedPassword = await hash('superadmin123', 10);
    
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@example.com',
        password: hashedPassword,
        role: 'SUPERADMIN',
        businessName: 'Main Business',
        businessAddress: '123 Main Street, City',
        businessContact: '1234567890',
        bankDetails: 'Bank Name, Account: 1234567890',
      },
    });
    
    console.log('SuperAdmin user created successfully!');
  } else {
    console.log('SuperAdmin user already exists.');
  }

  // Create a regular admin user if needed
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await hash('admin123', 10);
    
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        businessName: 'Branch Business',
        businessAddress: '456 Branch Street, City',
        businessContact: '0987654321',
        bankDetails: 'Bank Name, Account: 0987654321',
      },
    });
    
    console.log('Admin user created successfully!');
  } else {
    console.log('Admin user already exists.');
  }

  // Create sample products if they don't exist
  const existingProducts = await prisma.product.count();
  
  if (existingProducts === 0) {
    const sampleProducts = [
      {
        name: 'Laptop',
        quantity: 10,
        buyingPrice: 800,
        sellingPrice: 1000,
        wholesalePrice: 950,
        discountPercentage: 5,
        mrp: 1050,
        unit: 'piece',
        category: 'Electronics',
        supplier: 'Tech Supplies Inc.',
        taxRate: 18,
        description: 'High-performance laptop with 16GB RAM',
      },
      {
        name: 'Smartphone',
        quantity: 20,
        buyingPrice: 400,
        sellingPrice: 550,
        wholesalePrice: 500,
        discountPercentage: 2,
        mrp: 599,
        unit: 'piece',
        category: 'Electronics',
        supplier: 'Mobile World',
        taxRate: 18,
        description: 'Latest smartphone model with 128GB storage',
      },
      {
        name: 'Office Chair',
        quantity: 15,
        buyingPrice: 120,
        sellingPrice: 180,
        wholesalePrice: 160,
        discountPercentage: 0,
        mrp: 200,
        unit: 'piece',
        category: 'Furniture',
        supplier: 'Office Essentials',
        taxRate: 12,
        description: 'Ergonomic office chair with lumbar support',
      },
      {
        name: 'Printer Ink',
        quantity: 50,
        buyingPrice: 15,
        sellingPrice: 25,
        wholesalePrice: 22,
        discountPercentage: 0,
        mrp: 25,
        unit: 'cartridge',
        category: 'Office Supplies',
        supplier: 'Ink & Toner Co.',
        taxRate: 12,
        description: 'Compatible ink cartridge for HP printers',
      },
      {
        name: 'Notebook',
        quantity: 100,
        buyingPrice: 2,
        sellingPrice: 3.5,
        wholesalePrice: 3,
        discountPercentage: 0,
        mrp: 3.5,
        unit: 'piece',
        category: 'Stationery',
        supplier: 'Paper Products Ltd.',
        taxRate: 5,
        description: 'A5 ruled notebook with 100 pages',
      }
    ];
    
    await prisma.product.createMany({
      data: sampleProducts,
    });
    
    console.log('Sample products created successfully!');
  } else {
    console.log('Products already exist, skipping product seeding.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
