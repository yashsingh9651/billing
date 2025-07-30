'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  // Redirect to create page with id param
  // In a real implementation, this would be a separate edit form with pre-filled data
  useEffect(() => {
    router.push(`/dashboard/invoices/create?id=${id}`);
  }, [id, router]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
}
