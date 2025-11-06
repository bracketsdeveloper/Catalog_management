// src/components/vendors/useVendors.js
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

export function useVendors({
  backendUrl = process.env.REACT_APP_BACKEND_URL,
  includeDeleted = false,
} = {}) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`${backendUrl}/api/admin/vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setVendors(includeDeleted ? data : data.filter((v) => !v.deleted));
        setErr(null);
      } catch (e) {
        console.error("Fetch vendors failed:", e);
        setErr("Failed to fetch vendors");
      } finally {
        setLoading(false);
      }
    })();
  }, [backendUrl, includeDeleted]);

  const byId = useMemo(() => {
    const map = new Map();
    vendors.forEach((v) => map.set(String(v._id), v));
    return map;
  }, [vendors]);

  return { vendors, byId, loading, error: err };
}
