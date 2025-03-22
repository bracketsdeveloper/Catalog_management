// EmailVerification.js
'use client';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function EmailVerification() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying...");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    const verifyEmail = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/auth/verify?token=${token}`);
        setMessage(res.data.message);
        toast.success(res.data.message);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (error) {
        setMessage(error.response?.data?.message || "Verification failed");
        toast.error(error.response?.data?.message || "Verification failed");
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setMessage("No token provided");
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
      <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}
