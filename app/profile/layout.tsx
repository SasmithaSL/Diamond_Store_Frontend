'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userData, setUserData] = useState<{ name: string; points_balance: number; face_image: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchUserData();
  }, [router]);

  // Refresh user data when page becomes visible (e.g., after returning from edit)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/users/dashboard');
      setUserData({
        name: response.data.user.nickname || response.data.user.name,
        points_balance: response.data.user.points_balance,
        face_image: response.data.user.face_image,
      });
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar userName={userData.name} userBalance={userData.points_balance} userImage={userData.face_image} />
      <div className="flex-1 lg:ml-64">
        {children}
      </div>
    </div>
  );
}


