import { hash } from 'bcryptjs';
import { prisma } from './prisma';

export async function registerUser({
  name,
  email,
  password,
  businessName,
  businessAddress,
  businessGST,
  businessContact,
  bankDetails,
}: {
  name: string;
  email: string;
  password: string;
  businessName: string;
  businessAddress: string;
  businessGST?: string;
  businessContact: string;
  bankDetails: string;
}) {
  const hashedPassword = await hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      businessName,
      businessAddress,
      businessGST: businessGST || '',
      businessContact,
      bankDetails,
    },
  });

  return { id: user.id, name: user.name, email: user.email };
}
