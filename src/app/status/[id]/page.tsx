
"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function StatusRedirect() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    router.replace(`/track/${id}`);
  }, [id, router]);

  return <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8">Redirecting to track...</div>;
}
