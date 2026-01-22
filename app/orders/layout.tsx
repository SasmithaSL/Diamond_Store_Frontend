'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userData, setUserData] = useState<{ name: string; points_balance: number; face_image: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUpdated, setProfilePictureUpdated] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Check if profile picture was updated
    if (typeof window !== "undefined") {
      setProfilePictureUpdated(localStorage.getItem("profilePictureUpdated") === "true");
    }

    fetchUserData();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      if (typeof window !== "undefined") {
        setProfilePictureUpdated(localStorage.getItem("profilePictureUpdated") === "true");
      }
      fetchUserData();
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [router]);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/users/dashboard');
      const user = response.data.user;
      
      // Check if user is pending and redirect
      if (user.status === 'PENDING') {
        router.push('/pending');
        return;
      }
      
      setUserData({
        name: user.nickname || user.name,
        points_balance: user.points_balance,
        face_image: user.face_image,
      });
    } catch (err: any) {
      // If 403 or pending status, redirect to pending page
      if (err.response?.status === 403 || err.response?.data?.status === 'PENDING') {
        router.push('/pending');
        return;
      }
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
      <Sidebar userName={userData.name} userBalance={userData.points_balance} userImage={profilePictureUpdated ? userData.face_image : null} />
      <div className="flex-1 lg:ml-64">
        {children}
      </div>
    </div>
  );
}


