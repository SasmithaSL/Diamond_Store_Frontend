"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

interface Order {
  id: number;
  order_number: string;
  diamond_amount: number;
  quantity: number;
  points_used: number;
  status: string;
  created_at: string;
  updated_at?: string;
  client_imo_id?: string;
}

export default function ClientOrderHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.clientId
    ? decodeURIComponent(params.clientId as string)
    : "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [clientInfo, setClientInfo] = useState<{
    client_imo_id: string;
    totalDiamonds: number;
    totalOrders: number;
  } | null>(null);
  const [sellerName, setSellerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchUserData();
    if (clientId) {
      fetchClientOrders();
    }
  }, [clientId, router]);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      const user = response.data.user;
      setSellerName(user.nickname || user.name || "User");
    } catch (err: any) {
      console.error("Failed to fetch user data:", err);
      setSellerName("User");
    }
  };

  const fetchClientOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get("/orders/my-orders");
      const allOrders = response.data.orders || [];

      // Filter orders for this specific client
      const clientOrders = allOrders.filter(
        (order: Order) => order.client_imo_id === clientId
      );

      // Sort by date (newest first)
      clientOrders.sort(
        (a: Order, b: Order) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(clientOrders);

      // Calculate client info
      if (clientOrders.length > 0) {
        const totalDiamonds = clientOrders.reduce(
          (sum: number, order: Order) =>
            sum + order.diamond_amount * order.quantity,
          0
        );

        setClientInfo({
          client_imo_id: clientId,
          totalDiamonds,
          totalOrders: clientOrders.length,
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch client orders:", err);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Order History
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
        {clientInfo && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
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
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                  {clientInfo.client_imo_id || "Unnamed Client"}
                </h2>
                {clientInfo.client_imo_id &&
                  clientInfo.client_imo_id !== "unknown" && (
                    <p className="text-sm text-gray-500 mt-1">
                      IMO ID: {clientInfo.client_imo_id}
                    </p>
                  )}
                {orders.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Recharged{" "}
                    {(() => {
                      const now = new Date();
                      const lastOrder = new Date(orders[0].created_at);
                      const diffMs = now.getTime() - lastOrder.getTime();
                      const diffDays = Math.floor(
                        diffMs / (1000 * 60 * 60 * 24)
                      );

                      if (diffDays === 0) return "Today";
                      if (diffDays === 1) return "Yesterday";
                      return `${diffDays} days ago`;
                    })()}
                  </p>
                )}
              </div>
            </div>

            {/* Diamond Amount - Prominently Displayed */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Details:</p>
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-black"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                </svg>
                <span className="text-xl sm:text-2xl font-bold text-gray-800">
                  {clientInfo.totalDiamonds.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recharge History Section */}
        {orders.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-blue-600 text-center">
                Recharge History
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {orders.map((order, index) => {
                const totalDiamonds = order.quantity * order.diamond_amount;
                const orderDate = new Date(order.created_at);
                const formattedDate = orderDate
                  .toLocaleString("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "");

                return (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderModal(true);
                    }}
                    className="w-full px-4 sm:px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition text-left"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-black flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                        </svg>
                        <span className="text-base sm:text-lg font-semibold text-gray-800">
                          {totalDiamonds.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-600">{formattedDate}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {orders.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500">No orders found for this client</p>
          </div>
        )}

        {/* Create Order Button - Bottom of Page */}
        {clientInfo && (
          <div className="mt-6">
            <button
              onClick={() => {
                router.push(
                  `/dashboard?clientId=${encodeURIComponent(
                    clientInfo.client_imo_id
                  )}`
                );
              }}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 active:bg-primary-800 transition flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
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
              Create Order
            </button>
          </div>
        )}
      </main>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Order Details</h3>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
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

            {/* Status Symbol - Completed or Pending */}
            {(() => {
              const status = (selectedOrder.status || "").toUpperCase();
              if (status === "COMPLETED") {
                return (
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center mb-4">
                      <svg
                        className="w-12 h-12 text-white"
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
                    <h2 className="text-2xl font-bold text-gray-800">
                      Completed
                    </h2>
                  </div>
                );
              } else if (status === "PENDING") {
                return (
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                      <svg
                        className="w-12 h-12 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Pending
                    </h2>
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-4">
              {/* IMO ID */}
              {selectedOrder.client_imo_id && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">IMO ID</p>
                  <p className="text-base font-semibold text-gray-800">
                    {selectedOrder.client_imo_id}
                  </p>
                </div>
              )}

              {/* Order Number */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Order Number</p>
                <p className="text-base font-semibold text-gray-800">
                  {selectedOrder.order_number}
                </p>
              </div>

              {/* Total Amount */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-black"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                  </svg>
                  <p className="text-base font-semibold text-gray-800">
                    {selectedOrder.diamond_amount}
                  </p>
                </div>
              </div>

              {/* Number of Package */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Number of Package</p>
                <p className="text-base font-semibold text-gray-800">
                  {selectedOrder.quantity}
                </p>
              </div>

              {/* Total */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-black"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                  </svg>
                  <p className="text-base font-semibold text-gray-800">
                    {selectedOrder.quantity * selectedOrder.diamond_amount}
                  </p>
                </div>
              </div>

              {/* Seller */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Seller</p>
                <p className="text-base font-semibold text-gray-800">
                  {sellerName}
                </p>
              </div>

              {/* Order Time */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Order Time</p>
                <p className="text-base font-semibold text-gray-800">
                  {(() => {
                    const date = new Date(selectedOrder.created_at);
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const year = date.getFullYear();
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const seconds = String(date.getSeconds()).padStart(2, "0");
                    return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`;
                  })()}
                </p>
              </div>

              {/* Completion Time (only for COMPLETED orders) */}
              {(() => {
                const status = (selectedOrder.status || "").toUpperCase();
                if (status === "COMPLETED" && selectedOrder.updated_at) {
                  return (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Completion Time
                      </p>
                      <p className="text-base font-semibold text-gray-800">
                        {(() => {
                          const date = new Date(selectedOrder.updated_at);
                          const month = String(date.getMonth() + 1).padStart(
                            2,
                            "0"
                          );
                          const day = String(date.getDate()).padStart(2, "0");
                          const year = date.getFullYear();
                          const hours = String(date.getHours()).padStart(
                            2,
                            "0"
                          );
                          const minutes = String(date.getMinutes()).padStart(
                            2,
                            "0"
                          );
                          const seconds = String(date.getSeconds()).padStart(
                            2,
                            "0"
                          );
                          return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`;
                        })()}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
