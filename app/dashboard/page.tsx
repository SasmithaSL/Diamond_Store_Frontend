"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { removeToken, isAuthenticated } from "@/lib/auth";
import { getImageUrl, handleImageError } from "@/lib/imageUtils";

const DIAMOND_PACKAGES = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

interface DashboardData {
  user: {
    id: number;
    name: string;
    nickname: string | null;
    id_number: string;
    face_image: string | null;
    points_balance: number;
    status: string;
    created_at: string;
  };
  recentOrders: any[];
  recentTransactions: any[];
  orderCounts: {
    pending_acceptance: number;
    pending_recharge: number;
    completed: number;
    under_appeal: number;
  };
  salesToday: number;
  weeklySales: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

  // Gifting Order states
  const [selectedPackage, setSelectedPackage] = useState<number>(100);
  const [quantity, setQuantity] = useState<number>(1);
  const [clientImoId, setClientImoId] = useState<string>("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string>("");
  const [orderSuccess, setOrderSuccess] = useState<string>("");
  const [clientCount, setClientCount] = useState<number>(0);

  // Countdown timer states
  const [countdown, setCountdown] = useState<string>("");
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [weekRange, setWeekRange] = useState<string>("");

  // Pre-fill client ID from URL query params
  useEffect(() => {
    const clientIdFromUrl = searchParams?.get("clientId");
    if (clientIdFromUrl) {
      setClientImoId(decodeURIComponent(clientIdFromUrl));
    }
  }, [searchParams]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/users/dashboard");
      setData(response.data);

      // Fetch client count
      try {
        const ordersResponse = await api.get("/orders/my-orders");
        const orders = ordersResponse.data.orders || [];
        // Count unique client IMO IDs
        const uniqueClients = new Set(
          orders
            .map((order: any) => order.client_imo_id)
            .filter((id: string) => id && id.trim() !== "")
        );
        setClientCount(uniqueClients.size);
      } catch (err) {
        console.error("Failed to fetch client count:", err);
        setClientCount(0);
      }
    } catch (err: any) {
      if (
        err.response?.status === 403 ||
        err.response?.data?.status === "PENDING"
      ) {
        // Redirect to pending page if account is pending
        router.push("/pending");
        return;
      } else {
        setError("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchDashboard();
  }, [router]);

  // Refresh dashboard when page becomes visible (e.g., after returning from profile edit)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDashboard();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Countdown timer for Thursday 21:30 PM (48 hours before)
  // Also handles automatic data refresh when reset occurs
  const lastResetTimeRef = useRef<string>(""); // Store the reset time string to prevent duplicate refreshes
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;

    const calculateNextReset = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 4 = Thursday
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Calculate next Thursday 21:30 PM
      let nextThursday = new Date(now);
      nextThursday.setHours(21, 30, 0, 0);

      // If today is Thursday and it's before 21:30, use today
      // Otherwise, get next Thursday
      if (currentDay === 4) {
        if (currentHour < 21 || (currentHour === 21 && currentMinute < 30)) {
          // Today is Thursday and it's before 21:30
          // nextThursday is already set to today
        } else {
          // Today is Thursday but it's after 21:30, get next Thursday
          nextThursday.setDate(now.getDate() + 7);
        }
      } else {
        // Get next Thursday
        const daysUntilThursday = (4 - currentDay + 7) % 7;
        if (daysUntilThursday === 0) {
          // This shouldn't happen if currentDay !== 4, but handle it
          nextThursday.setDate(now.getDate() + 7);
        } else {
          nextThursday.setDate(now.getDate() + daysUntilThursday);
        }
      }

      // Calculate 48 hours before (Tuesday 21:30 PM)
      const countdownStart = new Date(nextThursday);
      countdownStart.setDate(countdownStart.getDate() - 2);
      countdownStart.setHours(21, 30, 0, 0);

      // Calculate week range (Thursday 21:30 PM to next Thursday 21:30 PM)
      const weekStart = new Date(now);
      weekStart.setHours(21, 30, 0, 0);

      // Find the most recent Thursday 21:30 PM
      let daysToSubtract = 0;
      if (currentDay === 4) {
        // Today is Thursday
        if (currentHour < 21 || (currentHour === 21 && currentMinute < 30)) {
          // Before 21:30, use last Thursday
          daysToSubtract = 7;
        } else {
          // After 21:30, use today
          daysToSubtract = 0;
        }
      } else if (currentDay === 0) {
        // Sunday: Thursday was 3 days ago
        daysToSubtract = 3;
      } else if (currentDay < 4) {
        // Monday (1), Tuesday (2), Wednesday (3): Thursday was currentDay + 3 days ago
        daysToSubtract = currentDay + 3;
      } else {
        // Friday (5), Saturday (6): Thursday was currentDay - 4 days ago
        daysToSubtract = currentDay - 4;
      }
      weekStart.setDate(now.getDate() - daysToSubtract);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Set week range string
      const startStr = weekStart.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      });
      const endStr = weekEnd.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      });
      setWeekRange(`${startStr}-${endStr}`);

      // Check if we've crossed the reset time (Thursday 21:30 PM) and refresh data
      // Only refresh once when we cross the threshold (within 5 minutes of 21:30)
      if (
        currentDay === 4 &&
        currentHour === 21 &&
        currentMinute >= 30 &&
        currentMinute < 35
      ) {
        // Create a unique identifier for this reset time (Thursday date + hour)
        const resetDate = new Date(now);
        resetDate.setHours(21, 30, 0, 0);
        const resetTimeId = `${resetDate.getFullYear()}-${resetDate.getMonth()}-${resetDate.getDate()}-21:30`;

        // Only refresh if we haven't refreshed for this specific reset time
        if (lastResetTimeRef.current !== resetTimeId) {
          console.log(
            "[Auto Refresh] Weekly reset detected, refreshing dashboard data..."
          );
          lastResetTimeRef.current = resetTimeId;

          // Clear any existing timeout
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }

          // Refresh the dashboard
          fetchDashboard();

          // Clear the reset time ID after 10 minutes to allow next week's refresh
          refreshTimeoutRef.current = setTimeout(() => {
            lastResetTimeRef.current = "";
          }, 10 * 60 * 1000);
        }
      }

      // Check if we should show countdown (within 48 hours before Thursday 21:30)
      if (now >= countdownStart && now < nextThursday) {
        setShowCountdown(true);
        const updateCountdown = () => {
          const now = new Date();
          const diff = nextThursday.getTime() - now.getTime();

          if (diff <= 0) {
            // Countdown ended - refresh data only once
            setCountdown("00:00:00");
            setShowCountdown(false);

            // Create unique ID for countdown end
            const countdownEndId = `countdown-${nextThursday.getTime()}`;
            if (lastResetTimeRef.current !== countdownEndId) {
              console.log(
                "[Auto Refresh] Countdown ended, refreshing dashboard data..."
              );
              lastResetTimeRef.current = countdownEndId;
              fetchDashboard();

              // Clear after 2 minutes
              if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
              }
              refreshTimeoutRef.current = setTimeout(() => {
                lastResetTimeRef.current = "";
              }, 2 * 60 * 1000);
            }
            return;
          }

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          setCountdown(
            `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
              2,
              "0"
            )}:${String(seconds).padStart(2, "0")}`
          );
        };

        updateCountdown();
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(updateCountdown, 1000);
      } else {
        setShowCountdown(false);
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
      }
    };

    calculateNextReset();
    const mainInterval = setInterval(calculateNextReset, 60000); // Update every minute

    // Also check every 30 seconds around reset time (Thursday 21:30 PM)
    const resetCheckInterval = setInterval(() => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if we're at Thursday 21:30 PM (within 30 seconds)
      if (currentDay === 4 && currentHour === 21 && currentMinute === 30) {
        const resetTime = new Date(now);
        resetTime.setHours(21, 30, 0, 0);
        resetTime.setSeconds(0, 0);

        // Create unique ID for this reset time
        const resetTimeId = `${resetTime.getFullYear()}-${resetTime.getMonth()}-${resetTime.getDate()}-21:30`;

        // Only refresh once - check if we haven't refreshed for this reset time
        if (
          now.getTime() - resetTime.getTime() < 30000 &&
          lastResetTimeRef.current !== resetTimeId
        ) {
          console.log(
            "[Auto Refresh] Weekly reset time reached, refreshing dashboard data..."
          );
          lastResetTimeRef.current = resetTimeId;
          fetchDashboard();

          // Clear after 10 minutes
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = setTimeout(() => {
            lastResetTimeRef.current = "";
          }, 10 * 60 * 1000);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(mainInterval);
      clearInterval(resetCheckInterval);
      if (countdownInterval) clearInterval(countdownInterval);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [fetchDashboard]);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const handleRequestPoints = async () => {
    const amount = parseInt(requestAmount);
    if (!requestAmount || isNaN(amount) || amount <= 0) {
      setRequestError("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    setRequestError("");
    setRequestSuccess("");
    try {
      const response = await api.post("/users/request-points", {
        amount,
        reason: requestReason || undefined,
      });

      setRequestSuccess(
        response.data.message || "Point request submitted successfully!"
      );
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestAmount("");
        setRequestReason("");
        setRequestSuccess("");
        fetchDashboard(); // Refresh dashboard
      }, 1500);
    } catch (err: any) {
      setRequestError(
        err.response?.data?.error || "Failed to submit point request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Gifting Order handlers
  const totalDiamonds = selectedPackage * quantity;
  const totalPrice = totalDiamonds;
  const canAfford = data ? data.user.points_balance >= totalPrice : false;

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOrderSubmit = async () => {
    setOrderError("");

    if (!clientImoId || clientImoId.trim() === "") {
      setOrderError("Please enter IMO ID");
      // Auto-hide error message after 3 seconds
      setTimeout(() => {
        setOrderError("");
      }, 3000);
      return;
    }

    if (!canAfford) {
      setOrderError("Insufficient points!");
      // Auto-hide error message after 3 seconds
      setTimeout(() => {
        setOrderError("");
      }, 3000);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmOrder = async () => {
    setOrderSubmitting(true);
    setShowConfirmModal(false);
    setOrderError("");
    setOrderSuccess("");
    try {
      const formData = new FormData();
      formData.append("diamondAmount", selectedPackage.toString());
      formData.append("quantity", quantity.toString());
      formData.append("clientImoId", clientImoId.trim());
      if (profilePhoto) {
        formData.append("profilePhoto", profilePhoto);
      }

      await api.post("/orders/request", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Reset form
      setClientImoId("");
      setProfilePhoto(null);
      setProfilePhotoPreview("");
      setQuantity(1);
      setSelectedPackage(100);
      setOrderError("");
      setOrderSuccess(
        "Order submitted successfully! It will be processed by admin."
      );
      fetchDashboard(); // Refresh dashboard

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setOrderSuccess("");
      }, 3000);
    } catch (err: any) {
      setOrderError(err.response?.data?.error || "Failed to submit request");
      // Auto-hide error message after 3 seconds
      setTimeout(() => {
        setOrderError("");
      }, 3000);
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getRewardPercentage = (sales: number): number => {
    if (sales >= 90000) return 2.6;
    if (sales >= 45000) return 2.1;
    if (sales >= 18000) return 1.6;
    if (sales >= 4500) return 1;
    return 0;
  };

  const calculateReward = (sales: number): number => {
    if (sales < 4500) return 0;

    let totalReward = 0;

    // Tier 1: 4,500 - 18,000 at 1%
    if (sales > 4500) {
      const tier1Amount = Math.min(sales, 18000) - 4500;
      if (tier1Amount > 0) {
        totalReward += tier1Amount * 0.01;
      }
    }

    // Tier 2: 18,000 - 45,000 at 1.6%
    if (sales > 18000) {
      const tier2Amount = Math.min(sales, 45000) - 18000;
      if (tier2Amount > 0) {
        totalReward += tier2Amount * 0.016;
      }
    }

    // Tier 3: 45,000 - 90,000 at 2.1%
    if (sales > 45000) {
      const tier3Amount = Math.min(sales, 90000) - 45000;
      if (tier3Amount > 0) {
        totalReward += tier3Amount * 0.021;
      }
    }

    // Tier 4: 90,000+ at 2.6%
    if (sales > 90000) {
      const tier4Amount = sales - 90000;
      if (tier4Amount > 0) {
        totalReward += tier4Amount * 0.026;
      }
    }

    // Round to 2 decimal places
    return Math.round(totalReward * 100) / 100;
  };

  const weeklySales = data?.weeklySales || 0;
  const rewardPercentage = getRewardPercentage(weeklySales);
  const rewardAmount = calculateReward(weeklySales);

  return (
    <div
      className="min-h-screen bg-gray-100 w-full overflow-x-hidden"
      style={{
        WebkitOverflowScrolling: "touch",
        maxWidth: "100vw",
        width: "100%",
      }}
    >
      <main
        className="px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto w-full"
        style={{ maxWidth: "100%", width: "100%", overflowX: "hidden" }}
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4 mb-4">
          {/* Available Diamonds Card */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-black flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
              </svg>
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Available Diamonds
              </h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 break-words">
              {typeof data.user.points_balance === "number"
                ? Math.floor(data.user.points_balance).toLocaleString("en-US")
                : Math.floor(
                    parseFloat(data.user.points_balance || 0)
                  ).toLocaleString("en-US")}
            </p>
          </div>

          {/* Weekly Sales Card */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-600 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0" />
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
              </svg>
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Weekly Sales
              </h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 break-words">
              {(data.weeklySales || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Weekly Sale Reward Cards Row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 mb-4">
          {/* Weekly Sale Reward Card */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-black flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
              </svg>
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Weekly Sale Reward
              </h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 break-words">
              {rewardAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Reward Percentage Card */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
              </svg>
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Reward Rate
              </h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-orange-500 break-words">
              {rewardPercentage > 0 ? `${rewardPercentage}%` : "0%"}
            </p>
          </div>
        </div>

        {/* Sales Reward Progress Section */}
        <div
          className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 mb-4 relative"
          style={{ overflow: "visible" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 truncate flex-1 min-w-0">
              IN Sales Reward: Up to{" "}
              {rewardPercentage > 0 ? `${rewardPercentage}%` : "2.6%"}
            </h3>
            {showCountdown ? (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-orange-500 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z" />
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16M7 0a7 7 0 1 1 0 14A7 7 0 0 1 7 0" />
                </svg>
                <span className="font-semibold">{countdown}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
                </svg>
                <span>
                  {weekRange ||
                    `${new Date().toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                    })}-${new Date(
                      Date.now() + 7 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                    })}`}
                </span>
              </div>
            )}
          </div>

          {/* Current Reward Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-orange-500">
                {rewardPercentage > 0 ? `${rewardPercentage}%` : "0%"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-black"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
              </svg>
              <span className="text-base font-semibold text-black">
                {rewardAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Reward Level Progress Bar */}
          <div
            className="mb-2 relative"
            style={{
              paddingTop: "20px",
              paddingBottom: "10px",
              width: "100%",
              maxWidth: "100%",
            }}
          >
            {/* Level indicators */}
            <div
              className="flex justify-between items-start relative z-10 mb-2 w-full"
              style={{ width: "100%", maxWidth: "100%" }}
            >
              <div
                className={`flex flex-col items-center flex-shrink-0 ${
                  weeklySales >= 4500 ? "text-green-600" : "text-gray-400"
                }`}
                style={{ width: "25%" }}
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  {weeklySales >= 4500 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-green-500 absolute -left-4"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                    </svg>
                  )}
                  <span className="text-xs font-semibold uppercase">Lv1</span>
                </div>
                <span
                  className={`text-xs mt-2 ${
                    weeklySales >= 4500 ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  1.0%
                </span>
              </div>
              <div
                className={`flex flex-col items-center flex-shrink-0 ${
                  weeklySales >= 18000 ? "text-green-600" : "text-gray-400"
                }`}
                style={{ width: "25%" }}
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  {weeklySales >= 18000 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-green-500 absolute -left-4"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                    </svg>
                  )}
                  <span className="text-xs font-semibold uppercase">Lv2</span>
                </div>
                <span
                  className={`text-xs mt-2 ${
                    weeklySales >= 18000 ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  1.6%
                </span>
              </div>
              <div
                className={`flex flex-col items-center flex-shrink-0 ${
                  weeklySales >= 45000 ? "text-green-600" : "text-gray-400"
                }`}
                style={{ width: "25%" }}
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  {weeklySales >= 45000 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-green-500 absolute -left-4"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                    </svg>
                  )}
                  <span className="text-xs font-semibold uppercase">Lv3</span>
                </div>
                <span
                  className={`text-xs mt-2 ${
                    weeklySales >= 45000 ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  2.1%
                </span>
              </div>
              <div
                className={`flex flex-col items-center flex-shrink-0 ${
                  weeklySales >= 90000 ? "text-green-600" : "text-gray-400"
                }`}
                style={{ width: "25%" }}
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  {weeklySales >= 90000 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-green-500 absolute -left-4"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                    </svg>
                  )}
                  <span className="text-xs font-semibold uppercase">Lv4</span>
                </div>
                <span
                  className={`text-xs mt-2 ${
                    weeklySales >= 90000 ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  2.6%
                </span>
              </div>
            </div>

            {/* Progress Line - positioned behind the circles */}
            <div
              className="absolute top-10 left-0 h-1.5"
              style={{ zIndex: 1, width: "100%", maxWidth: "100%", right: 0 }}
            >
              {/* Gray background line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-200 rounded-full"></div>
              {/* Green progress line - continuous based on weekly sales, matching Weekly Sales Progress bar */}
              {(() => {
                // Use same interpolation logic as Weekly Sales Progress bar
                // Diamond markers: 4,500 at 12.5%, 18,000 at 37.5%, 45,000 at 62.5%, 90,000 at 87.5%
                let progressWidth = 0;
                if (weeklySales >= 90000) {
                  progressWidth = 100; // Full bar when 90,000 or more
                } else if (weeklySales >= 45000) {
                  // Between 45,000 and 90,000: interpolate between 62.5% (LV3) and 87.5% (LV4)
                  const ratio = (weeklySales - 45000) / (90000 - 45000);
                  progressWidth = 62.5 + (87.5 - 62.5) * ratio;
                } else if (weeklySales >= 18000) {
                  // Between 18,000 and 45,000: interpolate between 37.5% (LV2) and 62.5% (LV3)
                  const ratio = (weeklySales - 18000) / (45000 - 18000);
                  progressWidth = 37.5 + (62.5 - 37.5) * ratio;
                } else if (weeklySales >= 4500) {
                  // Between 4,500 and 18,000: interpolate between 12.5% (LV1) and 37.5% (LV2)
                  const ratio = (weeklySales - 4500) / (18000 - 4500);
                  progressWidth = 12.5 + (37.5 - 12.5) * ratio;
                } else {
                  // Below 4,500: interpolate between 0% and 12.5% (LV1)
                  progressWidth = (weeklySales / 4500) * 12.5;
                }

                return (
                  <div
                    key={`reward-progress-${weeklySales}`}
                    className="absolute top-0 h-1.5 bg-green-500 rounded-full transition-all duration-300"
                    style={{
                      left: "0%",
                      width: `${Math.min(100, Math.max(0, progressWidth))}%`,
                    }}
                  ></div>
                );
              })()}
            </div>
          </div>

          {/* Weekly Sales Progress Bar */}
          <div
            className="relative"
            style={{
              marginTop: "10px",
              width: "100%",
              maxWidth: "100%",
              overflow: "visible",
            }}
          >
            <h4 className="text-sm sm:text-base font-bold text-gray-800 mb-3">
              Weekly Sales Progress {">"}
            </h4>
            <div
              className="relative w-full"
              style={{ width: "100%", maxWidth: "100%", overflow: "visible" }}
            >
              {/* Dashed vertical line - positioned to align with pill center */}
              {(() => {
                // Calculate the position where the line should align (same as pill center position)
                // Diamond markers: 4,500 at 12.5%, 18,000 at 37.5%, 45,000 at 62.5%, 90,000 at 87.5%
                let progressWidth = 0;
                if (weeklySales >= 90000) {
                  progressWidth = 100;
                } else if (weeklySales >= 45000) {
                  const ratio = (weeklySales - 45000) / (90000 - 45000);
                  progressWidth = 62.5 + (87.5 - 62.5) * ratio;
                } else if (weeklySales >= 18000) {
                  const ratio = (weeklySales - 18000) / (45000 - 18000);
                  progressWidth = 37.5 + (62.5 - 37.5) * ratio;
                } else if (weeklySales >= 4500) {
                  const ratio = (weeklySales - 4500) / (18000 - 4500);
                  progressWidth = 12.5 + (37.5 - 12.5) * ratio;
                } else {
                  progressWidth = (weeklySales / 4500) * 12.5;
                }

                const finalProgressWidth = Math.min(
                  100,
                  Math.max(0, progressWidth)
                );
                const pillLeftPosition =
                  weeklySales === 0 ? 1.5 : Math.max(1.5, finalProgressWidth);

                if (weeklySales >= 0 && weeklySales < 90000) {
                  // Line starts from top progress bar and extends down to touch pill center
                  // Keep it short - just from top bar to pill
                  return (
                    <div
                      className="absolute w-0.5 border-l-2 border-dashed border-green-500 pointer-events-none"
                      style={{
                        left: `${pillLeftPosition}%`,
                        top: "-80px", // Start from top progress bar area
                        height: "86px", // Height to touch pill center exactly
                        transform: "translateX(-50%)",
                        zIndex: 2,
                      }}
                    ></div>
                  );
                }
                return null;
              })()}

              {/* Progress Bar */}
              <div
                className="relative h-3 bg-gray-200 rounded-full mb-4 w-full"
                id="weekly-sales-progress-bar"
                style={{ overflow: "visible" }}
              >
                {(() => {
                  // Calculate progress based on level thresholds to match diamond marker positions
                  // Diamond markers: 4,500 at 12.5%, 18,000 at 37.5%, 45,000 at 62.5%, 90,000 at 87.5%
                  let progressWidth = 0;
                  if (weeklySales >= 90000) {
                    progressWidth = 100; // Full bar when 90,000 or more
                  } else if (weeklySales >= 45000) {
                    // Between 45,000 and 90,000: interpolate between 62.5% (LV3) and 87.5% (LV4)
                    const ratio = (weeklySales - 45000) / (90000 - 45000);
                    progressWidth = 62.5 + (87.5 - 62.5) * ratio;
                  } else if (weeklySales >= 18000) {
                    // Between 18,000 and 45,000: interpolate between 37.5% (LV2) and 62.5% (LV3)
                    const ratio = (weeklySales - 18000) / (45000 - 18000);
                    progressWidth = 37.5 + (62.5 - 37.5) * ratio;
                  } else if (weeklySales >= 4500) {
                    // Between 4,500 and 18,000: interpolate between 12.5% (LV1) and 37.5% (LV2)
                    const ratio = (weeklySales - 4500) / (18000 - 4500);
                    progressWidth = 12.5 + (37.5 - 12.5) * ratio;
                  } else {
                    // Below 4,500: interpolate between 0% and 12.5% (LV1)
                    progressWidth = (weeklySales / 4500) * 12.5;
                  }

                  const finalProgressWidth = Math.min(
                    100,
                    Math.max(0, progressWidth)
                  );

                  // Calculate pill position - use actual progress position
                  // For very small values (0 or near 0), use a small minimum to keep pill visible
                  // The pill uses translateX(-50%) so we need minimal offset for visibility
                  const pillLeftPosition =
                    weeklySales === 0 ? 1.5 : Math.max(1.5, finalProgressWidth);

                  return (
                    <>
                      <div
                        className="absolute h-3 bg-green-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${finalProgressWidth}%`,
                        }}
                      ></div>
                      {/* Amount indicator on progress bar */}
                      <div
                        className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 bg-green-500 rounded-full px-2 py-1 flex items-center justify-center transition-all duration-300 z-10"
                        style={{
                          left: `${pillLeftPosition}%`,
                          minWidth: "fit-content",
                        }}
                      >
                        <span className="text-white text-xs sm:text-sm font-semibold whitespace-nowrap">
                          {weeklySales.toLocaleString()}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Diamond markers and labels below progress bar - aligned with level markers above */}
              <div
                className="relative mb-2 w-full overflow-hidden"
                style={{ minHeight: "50px", width: "100%", maxWidth: "100%" }}
              >
                {/* 4,500 at 12.5% (aligned with LV1) */}
                <div
                  className="flex flex-col items-center absolute transform -translate-x-1/2"
                  style={{ left: "12.5%", top: "0", maxWidth: "20%" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 sm:w-5 sm:h-5 text-black mb-1"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                  </svg>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    4,500
                  </span>
                </div>
                {/* 18,000 at 37.5% (aligned with LV2) */}
                <div
                  className="flex flex-col items-center absolute transform -translate-x-1/2"
                  style={{ left: "37.5%", top: "0", maxWidth: "20%" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 sm:w-5 sm:h-5 text-black mb-1"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                  </svg>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    18,000
                  </span>
                </div>
                {/* 45,000 at 62.5% (aligned with LV3) */}
                <div
                  className="flex flex-col items-center absolute transform -translate-x-1/2"
                  style={{ left: "62.5%", top: "0", maxWidth: "20%" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 sm:w-5 sm:h-5 text-black mb-1"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                  </svg>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    45,000
                  </span>
                </div>
                {/* 90,000 at 87.5% (aligned with LV4) */}
                <div
                  className="flex flex-col items-center absolute transform -translate-x-1/2"
                  style={{ left: "87.5%", top: "0", maxWidth: "20%" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 sm:w-5 sm:h-5 text-black mb-1"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                  </svg>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    90,000
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                The gift reaches the target amount, and the excess will be
                rewarded as a percentage of the gift amount {">"}
              </p>
            </div>
          </div>
        </div>

        {/* Transfer Diamonds Section */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 mb-4 overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">
            Transfer Diamonds
          </h3>

          {/* IMO ID (Required) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IMO ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientImoId}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                setClientImoId(value);
              }}
              placeholder="Enter IMO ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* IMO Profile Photo (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IMO Profile Photo (Optional)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoChange}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition text-sm font-medium text-gray-700 whitespace-nowrap">
                  Choose File
                </span>
              </label>
              <span className="text-sm text-gray-500 flex-1 min-w-0 truncate">
                {profilePhoto ? profilePhoto.name : "No file chosen"}
              </span>
              {profilePhotoPreview && (
                <button
                  onClick={() => {
                    setProfilePhoto(null);
                    setProfilePhotoPreview("");
                  }}
                  className="text-red-600 hover:text-red-700 text-sm whitespace-nowrap flex-shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
            {profilePhotoPreview && (
              <div className="mt-3">
                <img
                  src={profilePhotoPreview}
                  alt="Profile preview"
                  className="w-20 h-20 rounded-lg object-cover border border-gray-300"
                />
              </div>
            )}
          </div>

          {/* Select a Gift Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Select Diamond Amount <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {DIAMOND_PACKAGES.map((pkg) => (
                <button
                  key={pkg}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedPackage === pkg
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold text-gray-800 text-lg">
                      {pkg}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Warning Messages - Before Quantity/Price/Balance Section */}
        {orderError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
            <span>{orderError}</span>
            <button
              onClick={() => setOrderError("")}
              className="text-red-700 hover:text-red-900 ml-4"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        {orderSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{orderSuccess}</span>
            </div>
            <button
              onClick={() => setOrderSuccess("")}
              className="text-green-700 hover:text-green-900 ml-4"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Separated Bottom Section - Quantity, Price, Balance, and Confirm */}
        <div className="mt-6 pt-6 border-t border-gray-200 bg-white rounded-lg shadow-md p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Quantity Selector - Left */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                −
              </button>
              <span className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 text-center flex items-center justify-center font-semibold text-gray-800 text-sm">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(100, quantity + 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-semibold text-gray-700 transition"
              >
                +
              </button>
            </div>

            {/* Price and Balance - Center */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0">
              <div className="text-xs sm:text-sm font-medium text-gray-800 flex items-center gap-1">
                Price{" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3 sm:w-4 sm:h-4 text-black flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                </svg>{" "}
                {totalPrice}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                Balance{" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3 text-black flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                </svg>{" "}
                <span className="truncate">
                  {typeof data.user.points_balance === "number"
                    ? data.user.points_balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : parseFloat(data.user.points_balance || 0).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}
                </span>
              </div>
            </div>

            {/* Confirm Button - Right */}
            <button
              onClick={handleOrderSubmit}
              disabled={!canAfford || orderSubmitting}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ml-auto ${
                canAfford
                  ? "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {orderSubmitting ? "Submitting..." : "Confirm"}
            </button>
          </div>
        </div>

        {/* My Client Section */}
        <div className="mt-4 mb-4">
          <Link
            href="/clients"
            className="w-full flex items-center justify-between bg-white rounded-xl shadow-md p-4 sm:p-5 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer overflow-hidden"
          >
            <span className="text-base sm:text-lg font-semibold text-gray-800">
              My Client ({clientCount})
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* Balance Increase History Section */}
        <div className="mt-4 mb-4">
          <Link
            href="/balance-increase-history"
            className="w-full flex items-center justify-between bg-white rounded-xl shadow-md p-4 sm:p-5 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer overflow-hidden"
          >
            <span className="text-base sm:text-lg font-semibold text-gray-800">
              Balance Increase History
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </main>

      {/* Request Points Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Request Points
            </h3>

            {requestError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {requestError}
              </div>
            )}

            {requestSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {requestSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => {
                    setRequestAmount(e.target.value);
                    setRequestError("");
                  }}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  min="1"
                  max="100000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Enter reason for requesting points"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestAmount("");
                  setRequestReason("");
                  setRequestError("");
                  setRequestSuccess("");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPoints}
                disabled={submitting || !requestAmount}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Order Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Confirm Order
            </h3>

            <div className="space-y-2 mb-6">
              <p className="text-gray-700">
                <span className="font-semibold">IMO ID:</span> {clientImoId}
              </p>
              {profilePhoto && (
                <p className="text-gray-700">
                  <span className="font-semibold">Profile Photo:</span>{" "}
                  {profilePhoto.name}
                </p>
              )}
              <p className="text-gray-700">
                <span className="font-semibold">Diamonds:</span> {quantity}x{" "}
                {selectedPackage} = {totalDiamonds} total
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
