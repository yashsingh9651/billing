// seed.js - Using JS extension to avoid TS compilation issues
const { PrismaClient } = require("../src/generated/prisma");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Check if the superadmin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: "SUPERADMIN",
    },
  });

  if (!existingSuperAdmin) {
    // Create a superadmin user
    const hashedPassword = await hash("yash198128&", 10);

    await prisma.user.create({
      data: {
        name: "Ashish Kumar Singh",
        email: "singhashish.201028@gmail.com",
        password: hashedPassword,
        role: "SUPERADMIN",
        businessName: "Akanksha Interprises",
        businessAddress:"Karwi, Chitrakoot, Uttar Pradesh",
        businessContact: "9005682747",
        bankDetails: "H.D.F.C. Bank Branch, Branch-Karwi?50200015143523?HDFC0002656",
      },
    });

    console.log("SuperAdmin user created successfully!");
  } else {
    console.log("SuperAdmin user already exists.");
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
