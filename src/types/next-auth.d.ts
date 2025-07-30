import { DefaultSession } from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      businessName?: string;
      businessAddress?: string;
      businessGST?: string;
      businessContact?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    businessName?: string;
    businessAddress?: string;
    businessGST?: string;
    businessContact?: string;
  }
}

// Extend the JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    businessName?: string;
    businessAddress?: string;
    businessGST?: string;
    businessContact?: string;
  }
}
