// pages/Signup.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function CreateAccount() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Invalid phone number. Must start with 6-9 and be 10 digits.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/signup",
        {
          name,
          email,
          phone,
          password,
        }
      );

      toast.success(response.data.message, {
        position: "top-center",
        autoClose: 3000,
      });
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occurred", {
        position: "top-center",
        autoClose: 3000,
      });
    }
  };

  return (
    <section
      className="bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] m-4 rounded-md"
    >
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto min-h-screen">
        {/* Increase the width by using max-w-xl (adjust as you prefer) */}
        <div className="w-full max-w-xl bg-white rounded-lg shadow dark:border dark:bg-gray-800 dark:border-gray-700">
          {/* Remove overflow and max-h to prevent vertical scrolling */}
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              Create an account
            </h1>
            <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="name"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 
                             rounded-lg focus:ring-primary-600 
                             focus:border-primary-600 block w-full p-2.5 
                             dark:bg-gray-700 dark:border-gray-600 
                             dark:placeholder-gray-400 dark:text-white"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Your Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 
                             rounded-lg focus:ring-primary-600 
                             focus:border-primary-600 block w-full p-2.5 
                             dark:bg-gray-700 dark:border-gray-600 
                             dark:placeholder-gray-400 dark:text-white"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 
                             rounded-lg focus:ring-primary-600 
                             focus:border-primary-600 block w-full p-2.5 
                             dark:bg-gray-700 dark:border-gray-600 
                             dark:placeholder-gray-400 dark:text-white"
                  placeholder="9876543210"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 
                               rounded-lg focus:ring-primary-600 
                               focus:border-primary-600 block w-full p-2.5 
                               dark:bg-gray-700 dark:border-gray-600 
                               dark:placeholder-gray-400 dark:text-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center 
                               pr-3 text-gray-500 hover:text-gray-700 
                               dark:text-gray-400"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Confirm password
                </label>
                <input
                  type="password"
                  name="confirm-password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 
                             rounded-lg focus:ring-primary-600 
                             focus:border-primary-600 block w-full p-2.5 
                             dark:bg-gray-700 dark:border-gray-600 
                             dark:placeholder-gray-400 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Add button texture (gradient) */}
              <button
                type="submit"
                className="w-full 
                           bg-gradient-to-r from-purple-600 to-pink-500 
                           hover:from-purple-700 hover:to-pink-600 
                           focus:ring-4 focus:outline-none 
                           focus:ring-purple-300 font-medium 
                           rounded-lg text-sm px-5 py-2.5 text-center 
                           text-white"
              >
                Create an account
              </button>

              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to={"/login"}
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Login here
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
