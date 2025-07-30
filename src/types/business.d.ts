import 'next-auth';

declare module 'next-auth' {
  interface User {
    businessName?: string;
    businessAddress?: string;
    businessGST?: string;
    businessContact?: string;
  }

  interface Session {
    user: {
      businessName?: string;
      businessAddress?: string;
      businessGST?: string;
      businessContact?: string;
    } & Session['user'];
  }
}
