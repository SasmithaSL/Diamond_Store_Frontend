"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";

export default function PendingPage() {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    // Update auth state
    setIsAuth(isAuthenticated());
  }, []);

  useEffect(() => {
    // Check if user is authenticated and their status
    const checkStatus = async () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);

      if (authenticated) {
        // If authenticated, use the dashboard endpoint
        try {
          const response = await api.get("/users/dashboard");
          const status = response.data.user.status?.toUpperCase(); // Normalize to uppercase

          // If approved, redirect to dashboard immediately
          if (status === "APPROVED") {
            // Clear pending ID from localStorage
            if (typeof window !== "undefined") {
              localStorage.removeItem("pendingIdNumber");
            }
            router.replace("/dashboard");
            return;
          } else if (status === "REJECTED") {
            // Clear pending ID from localStorage
            if (typeof window !== "undefined") {
              localStorage.removeItem("pendingIdNumber");
              sessionStorage.setItem("accountRejected", "true");
            }
            router.replace("/login");
            return;
          }
          // If PENDING, stay on this page
        } catch (err: any) {
          // If 403, user might still be pending
          if (err.response?.status === 403) {
            // Stay on page - user is pending
            return;
          }
          console.error("Error checking status:", err);
        }
      } else {
        // If not authenticated, check status using ID number from localStorage
        if (typeof window !== "undefined") {
          const pendingIdNumber = localStorage.getItem("pendingIdNumber");
          if (pendingIdNumber) {
            try {
              const response = await api.post("/auth/check-status", {
                idNumber: pendingIdNumber,
              });
              const status = response.data.status?.toUpperCase(); // Normalize to uppercase

              // If approved, redirect to login (user needs to login first)
              if (status === "APPROVED") {
                // Clear pending ID from localStorage
                localStorage.removeItem("pendingIdNumber");
                // Store a flag to show success message on login page
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("accountApproved", "true");
                }
                // Redirect to login
                router.replace("/login");
                return;
              } else if (status === "REJECTED") {
                // Clear pending ID from localStorage
                localStorage.removeItem("pendingIdNumber");
                // Store a flag to show rejection message on login page
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("accountRejected", "true");
                }
                router.replace("/login");
                return;
              }
              // If PENDING, stay on this page
            } catch (err: any) {
              // If 404, user might not exist (shouldn't happen but handle gracefully)
              if (err.response?.status === 404) {
                // Clear invalid ID from localStorage
                localStorage.removeItem("pendingIdNumber");
              }
              // For other errors, stay on page and continue checking
              console.error("Error checking status:", err);
            }
          }
        }
      }
    };

    // Check immediately
    checkStatus();

    // Check every 3 seconds to see if status changed (for both authenticated and unauthenticated)
    // This ensures we catch status changes even if user logs in while on this page
    const intervalId = setInterval(() => {
      checkStatus();
    }, 3000);

    // Also check when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 to-indigo-100"
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-xl p-8 md:p-10">
          {/* Clock Icon - Outlined circle with clock */}
          <div className="flex justify-center mb-8">
            <div className="relative w-24 h-24">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-24 text-yellow-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2.5" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6l4 2"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8">
            Account Under Review
          </h1>

          {/* Body Text */}
          <div className="space-y-4 text-gray-700 text-center">
            <p className="leading-relaxed">
              Your account is currently being reviewed by our team. This process
              typically takes 24-48 hours. We'll notify you once the review is
              complete.
            </p>
            <p className="leading-relaxed">
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
