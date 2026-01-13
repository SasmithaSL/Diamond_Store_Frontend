"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { removeToken, isAuthenticated } from "@/lib/auth";

interface Order {
  id: number;
  order_number: string;
  diamond_amount: number;
  quantity: number;
  points_used: number;
  status: string;
  created_at: string;
  client_imo_id?: string;
  user_id?: number;
}

interface ClientGroup {
  client_imo_id: string;
  orders: Order[];
  totalDiamonds: number;
  totalPoints: number;
  lastOrderDate: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending"
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchOrders();
  }, [router]);

  useEffect(() => {
    // Filter orders by status based on active tab
    const filteredOrders =
      activeTab === "pending"
        ? orders.filter(
            (order) => (order.status || "").toUpperCase() === "PENDING"
          )
        : orders.filter(
            (order) => (order.status || "").toUpperCase() === "COMPLETED"
          );

    // Group orders by client
    const grouped = groupOrdersByClient(filteredOrders);
    setClientGroups(grouped);
  }, [orders, activeTab]);

  const groupOrdersByClient = (ordersList: Order[]): ClientGroup[] => {
    const clientMap = new Map<string, ClientGroup>();

    ordersList.forEach((order) => {
      // Use client_imo_id as the key, fallback to 'unknown' if not available
      const clientId =
        order.client_imo_id && order.client_imo_id.trim() !== ""
          ? order.client_imo_id.trim()
          : "unknown";

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_imo_id: clientId,
          orders: [],
          totalDiamonds: 0,
          totalPoints: 0,
          lastOrderDate: order.created_at,
        });
      }

      const group = clientMap.get(clientId)!;
      group.orders.push(order);
      group.totalDiamonds += order.diamond_amount * order.quantity;
      group.totalPoints += order.points_used;

      // Update last order date if this order is more recent
      if (new Date(order.created_at) > new Date(group.lastOrderDate)) {
        group.lastOrderDate = order.created_at;
      }
    });

    // Sort orders within each group by date (newest first)
    clientMap.forEach((group) => {
      group.orders.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // Sort groups by last order date (newest first)
    return Array.from(clientMap.values()).sort(
      (a, b) =>
        new Date(b.lastOrderDate).getTime() -
        new Date(a.lastOrderDate).getTime()
    );
  };

  const handleClientClick = (client: ClientGroup) => {
    // Navigate to client order history page
    router.push(`/orders/client/${encodeURIComponent(client.client_imo_id)}`);
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders/my-orders");
      setOrders(response.data.orders || []);
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
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
              My Orders
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
        {/* Tabs */}
        {orders.length > 0 && (
          <div className="bg-white rounded-xl shadow-md mb-4 overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("pending")}
                className={`flex-1 px-4 py-4 text-center font-semibold transition text-sm ${
                  activeTab === "pending"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                Pending
                {(() => {
                  const pendingCount = orders.filter(
                    (order) =>
                      (order.status || "").toUpperCase() === "PENDING"
                  ).length;
                  return pendingCount > 0 ? ` (${pendingCount})` : "";
                })()}
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`flex-1 px-4 py-4 text-center font-semibold transition text-sm ${
                  activeTab === "completed"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                Completed
                {(() => {
                  const completedCount = orders.filter(
                    (order) =>
                      (order.status || "").toUpperCase() === "COMPLETED"
                  ).length;
                  return completedCount > 0 ? ` (${completedCount})` : "";
                })()}
              </button>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">No orders yet</p>
            <Link
              href="/dashboard"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Go to Dashboard →
            </Link>
          </div>
        ) : clientGroups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500">
              No {activeTab === "pending" ? "pending" : "completed"} orders
              found
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {clientGroups.map((client) => {
              // Calculate time since last order
              const getTimeAgo = (date: string) => {
                const now = new Date();
                const orderDate = new Date(date);
                const diffMs = now.getTime() - orderDate.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffMins < 1) {
                  return "Just now";
                } else if (diffMins < 60) {
                  return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
                } else if (diffHours < 24) {
                  return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
                } else if (diffDays === 0) {
                  return "Today";
                } else if (diffDays === 1) {
                  return "Yesterday";
                } else {
                  return `${diffDays} days ago`;
                }
              };

              const timeAgo = getTimeAgo(client.lastOrderDate);

              return (
                <button
                  key={client.client_imo_id}
                  onClick={() => handleClientClick(client)}
                  className="w-full bg-white rounded-xl shadow-md p-4 sm:p-5 hover:bg-gray-50 active:bg-gray-100 transition text-left overflow-hidden"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600"
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
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                        {client.client_imo_id || "Unnamed Client"}
                      </h3>
                      {client.client_imo_id &&
                        client.client_imo_id !== "unknown" && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            IMO ID: {client.client_imo_id}
                          </p>
                        )}
                      <p className="text-xs text-gray-400 mt-1">
                        Recharged {timeAgo}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <div className="flex items-center gap-1.5 justify-end mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 sm:w-5 sm:h-5 text-black"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                        </svg>
                        <span className="text-sm sm:text-base font-semibold text-gray-800">
                          {client.totalDiamonds.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {client.orders.length} order
                        {client.orders.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-gray-400"
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
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
