"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

interface Transaction {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  admin_id: number | null;
  admin_name: string | null;
  created_at: string;
}

export default function BalanceIncreaseHistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchTransactionHistory();
  }, [router]);

  const fetchTransactionHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/users/transaction-history");
      setTransactions(response.data.transactions || []);
    } catch (err: any) {
      setError("Failed to load transaction history");
      console.error("Failed to fetch transaction history:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-100 w-full overflow-x-hidden"
      style={{ maxWidth: "100vw", width: "100%" }}
    >
      <main
        className="px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto w-full"
        style={{ maxWidth: "100%", width: "100%", overflowX: "hidden" }}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Balance Increase History
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            All balance increases ({transactions.length})
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <p className="text-gray-600 text-lg">No transactions found</p>
            <p className="text-gray-500 text-sm mt-2">
              Balance increases will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {transactions.map((transaction, index) => {
              // Determine if it's a reward or admin transaction
              const isReward =
                transaction.description &&
                transaction.description.includes("Reward");
              const isMerchant =
                transaction.description &&
                transaction.description.includes("Recharge");

              // For Weekly Sale Reward transactions, calculate incremental amount from description
              // because the database stores amount as INT (rounded), not DECIMAL
              let displayAmount = 0;

              if (
                isReward &&
                transaction.description &&
                transaction.description.includes("Weekly Sale Reward")
              ) {
                // Extract total reward from current transaction description
                const currentRewardMatch =
                  transaction.description.match(/Reward:\s*([\d.]+)/);
                const currentTotalReward = currentRewardMatch
                  ? parseFloat(currentRewardMatch[1])
                  : 0;

                if (currentTotalReward > 0) {
                  // Find the previous Weekly Sale Reward transaction to calculate incremental
                  let previousTotalReward = 0;
                  for (let i = index + 1; i < transactions.length; i++) {
                    const prevTransaction = transactions[i];
                    if (
                      prevTransaction.description &&
                      prevTransaction.description.includes("Weekly Sale Reward")
                    ) {
                      const prevRewardMatch =
                        prevTransaction.description.match(/Reward:\s*([\d.]+)/);
                      if (prevRewardMatch) {
                        previousTotalReward = parseFloat(prevRewardMatch[1]);
                        break;
                      }
                    }
                  }

                  // Calculate incremental amount (difference between current and previous total)
                  displayAmount = currentTotalReward - previousTotalReward;
                  // Round to 2 decimal places
                  displayAmount = Math.round(displayAmount * 100) / 100;
                }
              } else {
                // For non-reward transactions, use the stored amount
                if (typeof transaction.amount === "number") {
                  displayAmount = transaction.amount;
                } else if (typeof transaction.amount === "string") {
                  displayAmount = parseFloat(transaction.amount) || 0;
                } else {
                  displayAmount =
                    parseFloat(String(transaction.amount || 0)) || 0;
                }

                // Ensure it's a valid number and preserve decimals
                if (isNaN(displayAmount)) {
                  displayAmount = 0;
                }

                // Round to 2 decimal places to ensure consistent display
                displayAmount = Math.round(displayAmount * 100) / 100;
              }

              // Get display text
              let primaryText = transaction.description || "Balance added";
              let secondaryText = "";

              if (isReward) {
                // Extract reward info from description
                if (transaction.description.includes("Weekly Sale Reward")) {
                  // Extract sales amount from description to calculate percentage
                  const salesMatch =
                    transaction.description.match(/Sales: ([\d,]+)/);
                  let rewardPercentage = "2.6%"; // Default to max

                  if (salesMatch && salesMatch[1]) {
                    const salesAmount = parseInt(
                      salesMatch[1].replace(/,/g, "")
                    );
                    // Calculate percentage based on sales amount (same logic as dashboard)
                    if (salesAmount >= 90000) {
                      rewardPercentage = "2.6%";
                    } else if (salesAmount >= 45000) {
                      rewardPercentage = "2.1%";
                    } else if (salesAmount >= 18000) {
                      rewardPercentage = "1.6%";
                    } else if (salesAmount >= 4500) {
                      rewardPercentage = "1.0%";
                    } else {
                      rewardPercentage = "0%";
                    }
                  }

                  primaryText = `IN Sales Reward: Up to ${rewardPercentage}`;
                  secondaryText = "From task reward";
                } else {
                  primaryText = transaction.description;
                  secondaryText = "From task reward";
                }
              } else if (isMerchant) {
                primaryText = `★MERCHANT ${transaction.description.replace(
                  "Recharge from Agent",
                  ""
                )}`;
                secondaryText = "Recharge from Agent";
              } else if (transaction.admin_name) {
                // For admin-added points, show "Quick Smart"
                primaryText = "Quick Smart";
                secondaryText = "";
              } else {
                primaryText = transaction.description || "Balance added";
                secondaryText = "Balance increase";
              }

              // Check if it's a Quick Smart transaction (admin-added points)
              const isQuickSmart = transaction.admin_name !== null;

              // Format date as YYYY/MM/DD HH:mm:ss
              const formatDate = (dateString: string) => {
                const date = new Date(dateString);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const seconds = String(date.getSeconds()).padStart(2, "0");
                return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
              };

              return (
                <div
                  key={transaction.id}
                  className="bg-white rounded-xl shadow-md p-4 sm:p-5 overflow-hidden"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {isQuickSmart ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                          <Image
                            src="/images/quick_smart_1.jpeg"
                            alt="Quick Smart"
                            width={48}
                            height={48}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      ) : isReward ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs sm:text-sm font-semibold text-blue-600">
                            imo
                          </span>
                        </div>
                      ) : isMerchant ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-1">
                        {primaryText}
                      </h3>
                      {secondaryText && (
                        <p className="text-xs sm:text-sm text-gray-500 mb-2">
                          {secondaryText}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                      </svg>
                      <span className="text-sm sm:text-base font-semibold text-gray-800">
                        +
                        {displayAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
