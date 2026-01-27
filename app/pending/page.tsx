"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import api from "@/lib/api";

export default function PendingPage() {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Update auth state
    setIsAuth(isAuthenticated());
  }, []);

  const checkStatus = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    setCheckError(null);

    const authenticated = isAuthenticated();
    setIsAuth(authenticated);

    try {
      if (authenticated) {
        const response = await api.get("/users/dashboard");
        const status = response.data.user.status?.toUpperCase();

        if (status === "APPROVED") {
          if (typeof window !== "undefined") {
            localStorage.removeItem("pendingIdNumber");
          }
          router.replace("/dashboard");
          return;
        }
        if (status === "REJECTED") {
          if (typeof window !== "undefined") {
            localStorage.removeItem("pendingIdNumber");
            sessionStorage.setItem("accountRejected", "true");
          }
          router.replace("/login");
          return;
        }
      } else if (typeof window !== "undefined") {
        const pendingIdNumber = localStorage.getItem("pendingIdNumber");
        if (pendingIdNumber) {
          const response = await api.post("/auth/check-status", {
            idNumber: pendingIdNumber,
          });
          const status = response.data.status?.toUpperCase();

          if (status === "APPROVED") {
            localStorage.removeItem("pendingIdNumber");
            sessionStorage.setItem("accountApproved", "true");
            router.replace("/login");
            return;
          }
          if (status === "REJECTED") {
            localStorage.removeItem("pendingIdNumber");
            sessionStorage.setItem("accountRejected", "true");
            router.replace("/login");
            return;
          }
        }
      }
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        if (err.response?.status === 404 && typeof window !== "undefined") {
          localStorage.removeItem("pendingIdNumber");
        }
      } else {
        setCheckError("Unable to check status right now. Try again.");
        console.error("Error checking status:", err);
      }
    } finally {
      setLastCheckedAt(new Date());
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    checkStatus();

    const pendingIdNumber = localStorage.getItem("pendingIdNumber");
    if (!pendingIdNumber) {
      return;
    }

    const rawBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const baseUrl =
      window.location.protocol === "https:" &&
      rawBaseUrl.startsWith("http://")
        ? rawBaseUrl.replace("http://", "https://")
        : rawBaseUrl;
    const streamUrl = `${baseUrl}/auth/status-stream/${encodeURIComponent(
      pendingIdNumber
    )}`;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const handleStatus = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data || "{}");
        const status = (data.status || "").toUpperCase();
        if (status === "APPROVED") {
          localStorage.removeItem("pendingIdNumber");
          sessionStorage.setItem("accountApproved", "true");
          router.replace("/login");
        } else if (status === "REJECTED") {
          localStorage.removeItem("pendingIdNumber");
          sessionStorage.setItem("accountRejected", "true");
          router.replace("/login");
        }
      } catch (err) {
        console.error("Invalid SSE status payload:", err);
      }
    };

    const connect = () => {
      if (closed) return;
      eventSource = new EventSource(streamUrl);
      eventSource.addEventListener("status", handleStatus);
      eventSource.onerror = () => {
        if (closed) return;
        eventSource?.close();
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 10000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      eventSource?.close();
    };
  }, [checkStatus, router]);

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

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={checkStatus}
              disabled={isChecking}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {isChecking ? "Checking..." : "Check status"}
            </button>
            {lastCheckedAt && (
              <div className="mt-3 text-sm text-gray-500">
                Last checked: {lastCheckedAt.toLocaleTimeString()}
              </div>
            )}
            {checkError && (
              <div className="mt-3 text-sm text-red-600">{checkError}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
