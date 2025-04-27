"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import SampleStatusTable from "../components/samples/SampleStatusTable.js";

export default function SampleStatus() {
  const [samples, setSamples] = useState([]);
  const [outs, setOuts]       = useState([]);
  const BACKEND_URL           = process.env.REACT_APP_BACKEND_URL;
  const token                 = localStorage.getItem("token");

  useEffect(() => {
    async function fetchData() {
      try {
        const [sRes, oRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/admin/samples`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/api/admin/sample-outs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setSamples(sRes.data);
        setOuts(oRes.data);
      } catch (err) {
        console.error("Error loading sample status:", err);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sample Status</h1>
      <SampleStatusTable samples={samples} outs={outs} />
    </div>
  );
}
