"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function ClientsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchCompletedOrders();
  }, [router]);

  const fetchCompletedOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/orders/my-orders");
      const allOrders = response.data.orders || [];
      // Filter only completed orders
      const completedOrders = allOrders.filter(
        (order: Order) => (order.status || "").toUpperCase() === "COMPLETED"
      );
      // Sort by date (newest first)
      completedOrders.sort(
        (a: Order, b: Order) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(completedOrders);
    } catch (err: any) {
      setError("Failed to load completed orders");
      console.error("Failed to fetch completed orders:", err);
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

  // Group orders by client
  const groupOrdersByClient = (ordersList: Order[]) => {
    const clientMap = new Map<
      string,
      {
        client_imo_id: string;
        orders: Order[];
        totalDiamonds: number;
        lastOrderDate: string;
      }
    >();

    ordersList.forEach((order) => {
      const clientId =
        order.client_imo_id && order.client_imo_id.trim() !== ""
          ? order.client_imo_id.trim()
          : "unknown";

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_imo_id: clientId,
          orders: [],
          totalDiamonds: 0,
          lastOrderDate: order.created_at,
        });
      }

      const group = clientMap.get(clientId)!;
      group.orders.push(order);
      group.totalDiamonds += order.diamond_amount * order.quantity;

      if (new Date(order.created_at) > new Date(group.lastOrderDate)) {
        group.lastOrderDate = order.created_at;
      }
    });

    clientMap.forEach((group) => {
      group.orders.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return Array.from(clientMap.values()).sort(
      (a, b) =>
        new Date(b.lastOrderDate).getTime() -
        new Date(a.lastOrderDate).getTime()
    );
  };

  const clientGroups = groupOrdersByClient(orders);

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
            My Clients
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Completed Order History ({clientGroups.length} clients)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Clients List */}
        {clientGroups.length === 0 ? (
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p className="text-gray-600 text-lg">No completed orders found</p>
            <p className="text-gray-500 text-sm mt-2">
              Completed orders will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {clientGroups.map((client) => {
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
                <Link
                  key={client.client_imo_id}
                  href={`/orders/client/${encodeURIComponent(
                    client.client_imo_id
                  )}`}
                  className="block w-full bg-white rounded-xl shadow-md p-4 sm:p-5 hover:bg-gray-50 active:bg-gray-100 transition overflow-hidden"
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
                        Last order {timeAgo}
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
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
