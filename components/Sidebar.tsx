"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { removeToken } from "@/lib/auth";
import { getImageUrl } from "@/lib/imageUtils";

interface SidebarProps {
  userName: string;
  userBalance: number;
  userImage?: string | null;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export default function Sidebar({
  userName,
  userBalance,
  userImage,
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
}: SidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;
  const pathname = usePathname();
  const router = useRouter();

  // Auto-open sidebar on desktop, closed on mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        if (window.innerWidth >= 1024) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      };

      // Set initial state
      handleResize();

      // Listen for resize events
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.innerWidth < 1024;

    if (isOpen && isMobile) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent scrolling
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // Restore scrolling
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    // Cleanup on unmount
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    };
  }, [isOpen]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && window.innerWidth < 1024) {
        const target = e.target as HTMLElement;
        if (!target.closest("aside")) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/profile", label: "Edit Profile" },
    { href: "/orders", label: "Order History" },
    { href: "/balance-increase-history", label: "Balance Increase History" },
  ];

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white shadow-xl border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100dvh", // Use dynamic viewport height for mobile
          width: "256px",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* User Info Section */}
        <div className="flex-shrink-0 p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {userImage ? (
                  <img
                    key={`sidebar-avatar-${userImage}`}
                    src={getImageUrl(userImage) || ""}
                    alt={userName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white border-opacity-30"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector(".default-avatar")) {
                        const fallback = document.createElement("div");
                        fallback.className = "default-avatar w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center border-2 border-white border-opacity-30 text-white font-semibold text-lg";
                        fallback.innerHTML = `<span>${(userName || "U")[0].toUpperCase()}</span>`;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center border-2 border-white border-opacity-30 text-white font-semibold text-lg">
                    <span>{(userName || "U")[0].toUpperCase()}</span>
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{userName}</p>
                <p className="text-xs text-primary-100 mt-1 flex items-center gap-1 flex-wrap">
                  <span>Diamond Balance:</span>
                  <span className="flex items-center gap-1">
                    {userBalance !== undefined && userBalance !== null
                      ? typeof userBalance === "number"
                        ? userBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : parseFloat(String(userBalance) || "0").toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                      : "0.00"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 text-white flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z" />
                    </svg>
                  </span>
                </p>
              </div>
            </div>
          </div>

        {/* Menu Items */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4" style={{ flexShrink: 1 }}>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-6 py-3 mx-2 mb-1 rounded-lg transition text-sm ${
                  isActive(item.href)
                    ? "bg-primary-50 text-primary-700 font-semibold border-l-4 border-primary-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

        {/* Logout Button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
