import 'next-auth';

declare module 'next-auth' {
  interface User {
    businessName?: string;
    businessAddress?: string;
    businessGST?: string;
    businessContact?: string;
    businessStateCode?: string;
    businessState?: string;
    businessEmail?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    authorisedSignatory?: string;
  }

  interface Session {
    user: {
      businessName?: string;
      businessAddress?: string;
      businessGST?: string;
      businessContact?: string;
      businessStateCode?: string;
      businessState?: string;
      businessEmail?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      authorisedSignatory?: string;
    } & Session['user'];
  }
}
