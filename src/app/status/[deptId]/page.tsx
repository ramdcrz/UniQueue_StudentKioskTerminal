
"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function StatusRedirect() {
  const router = useRouter();
  const { deptId } = useParams();

  useEffect(() => {
    router.replace(`/track/${deptId}`);
  }, [deptId, router]);

  return <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8">Redirecting...</div>;
}
