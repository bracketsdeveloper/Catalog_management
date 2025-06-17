import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SignIn() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role === "ADMIN") {
      navigate("/admin-dashboard");
    } else if (token && role === "VIEWER") {
      navigate("/viewer-dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password,
      });

      toast.success(response.data.message || "Login successful!", {
        position: "top-center",
        autoClose: 3000,
      });

      const { token, role, name, permissions, isSuperAdmin } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role || "GENERAL");
      localStorage.setItem("name", name || "");
      localStorage.setItem("permissions", JSON.stringify(permissions || []));
      localStorage.setItem("isSuperAdmin", isSuperAdmin ? "true" : "false");

      if (role === "ADMIN") {
        navigate("/admin-dashboard");
      } else if (role === "VIEWER") {
        navigate("/viewer-dashboard");
      } else {
        navigate("/admin-dashboard");
      }

      window.location.reload();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "An error occurred. Please try again.",
        {
          position: "top-center",
          autoClose: 3000,
        }
      );
      console.error("Login error:", error);
    }
  };

  return (
   <section
  className="h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center bg-white"
  style={{ backgroundImage: "url('/Login_page.png')" }} // Replace with your actual image path
>
  <div className="bg-white m-4 rounded-md w-full max-w-md shadow-lg">
    <div className="flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full bg-white rounded-lg shadow dark:bg-white">
        <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-black">
            Sign in to your account
          </h1>
          <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-black"
              >
                Your email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5"
                placeholder="name@company.com"
                required
              />
            </div>
            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-black"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-pink-500 focus:border-pink-500 block w-full p-2.5"
                placeholder="••••••••"
                required
              />
            </div>
            {/* Remember + Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-500">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-[#ff8045] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            {/* Submit Button */}
            <button
              type="submit"
              className="w-full text-white bg-[#Ff8045] hover:bg-pink-600 focus:ring-4 focus:outline-none focus:ring-pink-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
            >
              Login
            </button>
            {/* Sign Up Link */}
            <p className="text-sm font-light text-gray-500">
              Don't have an account yet?{" "}
              <Link
                to="/signup"
                className="font-medium text-[#ff8045] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>

  );
}