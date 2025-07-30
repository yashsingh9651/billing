import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, businessName, businessAddress, businessGST, businessContact, bankDetails } = body;

    // Check if required fields are present
    if (!name || !email || !password || !businessName || !businessAddress || !businessContact || !bankDetails) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Register the new user
    const user = await registerUser({
      name,
      email,
      password,
      businessName,
      businessAddress,
      businessGST,
      businessContact,
      bankDetails,
    });

    return NextResponse.json(
      { message: 'User registered successfully', user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
