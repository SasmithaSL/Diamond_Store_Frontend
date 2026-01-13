"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { getImageUrl } from "@/lib/imageUtils";

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userData, setUserData] = useState<{
    name: string;
    points_balance: number;
    face_image: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchUserData();
  }, [router]);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/users/dashboard");
      const user = response.data.user;

      // Check if user is pending and redirect
      if (user.status === "PENDING") {
        router.push("/pending");
        return;
      }

      setUserData({
        name: user.nickname || user.name,
        points_balance: user.points_balance,
        face_image: user.face_image,
      });
    } catch (err: any) {
      // If 403 or pending status, redirect to pending page
      if (
        err.response?.status === 403 ||
        err.response?.data?.status === "PENDING"
      ) {
        router.push("/pending");
        return;
      }
      console.error("Failed to fetch user data:", err);
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
    <div
      className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden"
      style={{ maxWidth: "100vw", width: "100%" }}
    >
      {/* Header */}
      <header
        className="bg-white h-16 sm:h-18 flex items-center px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6 shadow-md sticky top-0 z-30 w-full max-w-full overflow-x-hidden"
        style={{
          WebkitOverflowScrolling: "touch",
          maxWidth: "100vw",
          width: "100%",
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-700 flex-shrink-0"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1 min-w-0"></div>

        {/* Right: Name, Role, and Profile Picture */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex flex-col items-end min-w-0">
            <h1 className="text-xs xs:text-sm sm:text-base lg:text-lg font-bold text-gray-800 uppercase truncate max-w-[100px] xs:max-w-[120px] sm:max-w-none">
              {userData.name}
            </h1>
            <p className="text-xs text-gray-500 whitespace-nowrap">Reseller</p>
          </div>

          <Link
            href="/profile"
            className="relative flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          >
            {userData.face_image ? (
              <img
                src={getImageUrl(userData.face_image) || ""}
                alt={userData.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23ddd" width="48" height="48" rx="24"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="20"%3E👤%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                <span className="text-lg">👤</span>
              </div>
            )}
            {/* Green checkmark badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-x-hidden w-full">
        <Sidebar
          userName={userData.name}
          userBalance={userData.points_balance}
          userImage={userData.face_image}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        <div
          className="flex-1 w-full min-w-0 lg:ml-64 overflow-x-hidden"
          style={{ maxWidth: "100vw", width: "100%" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
