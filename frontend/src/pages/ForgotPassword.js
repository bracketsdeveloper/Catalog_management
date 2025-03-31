import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ForgotPassword() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, { email });
      toast.success("OTP sent to your email!", {
        position: "top-center",
        autoClose: 3000,
      });
      setStep(2);
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to send OTP. Please try again.",
        {
          position: "top-center",
          autoClose: 3000,
        }
      );
      console.error("Error sending OTP:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/verify-otp`, { email, otp });
      toast.success("OTP verified successfully!", {
        position: "top-center",
        autoClose: 3000,
      });
      setStep(3);
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Invalid OTP. Please try again.",
        {
          position: "top-center",
          autoClose: 3000,
        }
      );
      console.error("Error verifying OTP:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match!", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/reset-password`, {
        email,
        otp,
        newPassword,
      });
      toast.success("Password reset successfully!", {
        position: "top-center",
        autoClose: 3000,
      });
      navigate("/login");
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to reset password. Please try again.",
        {
          position: "top-center",
          autoClose: 3000,
        }
      );
      console.error("Error resetting password:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] m-4 rounded-md">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <div className="w-full bg-white rounded-lg shadow sm:max-w-md xl:p-0 dark:bg-gray-800">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              {step === 1 && "Reset Password"}
              {step === 2 && "Verify OTP"}
              {step === 3 && "Set New Password"}
            </h1>

            {step === 1 && (
              <form className="space-y-4 md:space-y-6" onSubmit={handleSendOtp}>
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Your email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white bg-pink-600 hover:bg-pink-700 focus:ring-4 focus:outline-none focus:ring-pink-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-pink-400 dark:hover:bg-pink-600 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
                <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                  Remember your password?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-pink-400 hover:underline dark:text-pink-500"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            )}

            {step === 2 && (
              <form className="space-y-4 md:space-y-6" onSubmit={handleVerifyOtp}>
                <div>
                  <label
                    htmlFor="otp"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter 6-digit OTP"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white bg-pink-600 hover:bg-pink-700 focus:ring-4 focus:outline-none focus:ring-pink-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-pink-400 dark:hover:bg-pink-600 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
            )}

            {step === 3 && (
              <form className="space-y-4 md:space-y-6" onSubmit={handleResetPassword}>
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="••••••••"
                    required
                    minLength="6"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="••••••••"
                    required
                    minLength="6"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white bg-pink-600 hover:bg-pink-700 focus:ring-4 focus:outline-none focus:ring-pink-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-pink-400 dark:hover:bg-pink-600 disabled:opacity-50"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}