"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"error" | "pending" | "rejected">(
    "error"
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Check if account was just approved or rejected
  useEffect(() => {
    if (typeof window !== "undefined") {
      const accountApproved = sessionStorage.getItem("accountApproved");
      const accountRejected = sessionStorage.getItem("accountRejected");

      if (accountApproved === "true") {
        setSuccessMessage(
          "Your account has been approved! Please login to continue."
        );
        sessionStorage.removeItem("accountApproved");
        // Clear after 5 seconds
        setTimeout(() => setSuccessMessage(""), 5000);
      }

      if (accountRejected === "true") {
        setRejectionMessage(
          "Your account registration has been rejected. Please contact support for more information."
        );
        setErrorType("rejected");
        setShowRejectionModal(true);
        sessionStorage.removeItem("accountRejected");
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", formData);
      const { token, user } = response.data;

      setToken(token);

      if (user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const statusCode = err.response?.status;
      let errorMessage = err.response?.data?.error || "Login failed";
      const errorStatus = err.response?.data?.status;

      // Handle rate limiting
      if (statusCode === 429) {
        errorMessage =
          "Too many login attempts. Please wait a few minutes before trying again.";
        setErrorType("error");
        setError(errorMessage);
      } else {
        // Determine error type for better UI
        if (errorMessage.includes("pending") || errorStatus === "PENDING") {
          // Redirect to pending page instead of showing error
          router.push("/pending");
          return;
        } else if (
          errorMessage.includes("rejected") ||
          errorStatus === "REJECTED"
        ) {
          setErrorType("rejected");
        } else {
          setErrorType("error");
        }
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Rejection Modal - Full Screen */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="w-full h-full flex flex-col">
            {/* Header with X button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-800">Verify Identity</h2>
              <div className="w-6"></div> {/* Spacer for centering */}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              {/* Error Icon */}
              <div className="mb-6 relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">!</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                Verification Unsuccessful
              </h1>

              {/* Subtext */}
              <p className="text-base text-gray-700 mb-8 text-center max-w-md">
                Please re-submit your information to verify your identity
              </p>

              {/* Re-submit Button */}
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  router.push("/register");
                }}
                className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Re-submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Form */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {error && (
            <div
              className={`mb-4 rounded-lg overflow-hidden ${
                errorType === "pending"
                  ? "bg-amber-50 border border-amber-200"
                  : errorType === "rejected"
                  ? "bg-red-50 border border-red-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 mt-0.5 ${
                      errorType === "pending"
                        ? "text-amber-600"
                        : errorType === "rejected"
                        ? "text-red-600"
                        : "text-red-600"
                    }`}
                  >
                    {errorType === "pending" ? (
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : errorType === "rejected" ? (
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
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
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
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold mb-1 ${
                        errorType === "pending"
                          ? "text-amber-800"
                          : errorType === "rejected"
                          ? "text-red-800"
                          : "text-red-800"
                      }`}
                    >
                      {errorType === "pending"
                        ? "Account Pending Approval"
                        : errorType === "rejected"
                        ? "Account Rejected"
                        : "Login Failed"}
                    </h3>
                    <p
                      className={`text-sm ${
                        errorType === "pending"
                          ? "text-amber-700"
                          : errorType === "rejected"
                          ? "text-red-700"
                          : "text-red-700"
                      }`}
                    >
                      {errorType === "pending"
                        ? "Your registration is being reviewed by our admin team. You will be able to access your account once it's approved. Please check back later or contact support if you have questions."
                        : errorType === "rejected"
                        ? "Your account registration has been rejected. Please contact support for more information or register again with correct information."
                        : error}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 active:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-primary-600 font-semibold hover:text-primary-700"
              >
                Register
              </Link>
            </p>
          </div>

          {successMessage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
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
                <span className="font-semibold">{successMessage}</span>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
