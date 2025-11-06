// src/components/vendors/VendorDropdown.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVendors } from "./useVendors";

export default function VendorDropdown({
  value,                 // vendorId (string)
  onChange,              // (vendorId, vendorObject) => void
  backendUrl,            // optional override
  placeholder = "Select a vendor…",
  disableNonReliable = false, // if true, prevents selecting "non-reliable"
  className = "",
}) {
  const { vendors, byId, loading, error } = useVendors({ backendUrl });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef(null);

  const selectedVendor = value ? byId.get(String(value)) : null;

  const filtered = useMemo(() => {
    if (!q) return vendors;
    const s = q.toLowerCase();
    return vendors.filter((v) => {
      const hay = [
        v.vendorCompany,
        v.vendorName,
        v.brandDealing,
        v.location,
        v.gst,
        v.postalCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [vendors, q]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSelect = (v) => {
    if (disableNonReliable && (v.reliability || "reliable") === "non-reliable") {
      // soft block with a toast/alert if you prefer
      return;
    }
    onChange && onChange(String(v._id), v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`border rounded px-2 py-2 text-sm flex items-center justify-between cursor-pointer ${!selectedVendor ? "text-gray-500" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">
          {selectedVendor
            ? `${selectedVendor.vendorCompany || selectedVendor.vendorName || "(Unnamed)"}${
                (selectedVendor.reliability || "reliable") === "non-reliable"
                  ? " — NON-RELIABLE"
                  : ""
              }`
            : placeholder}
        </span>
        <span className="ml-2">▾</span>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border rounded shadow">
          <div className="p-2 border-b">
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Search vendor, company, location…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {loading && (
              <div className="p-3 text-xs text-gray-500">Loading…</div>
            )}
            {error && (
              <div className="p-3 text-xs text-red-600">{error}</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-3 text-xs text-gray-500">No vendors found</div>
            )}
            {filtered.map((v) => {
              const nonRel = (v.reliability || "reliable") === "non-reliable";
              return (
                <button
                  key={v._id}
                  type="button"
                  onClick={() => handleSelect(v)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                    nonRel ? "text-red-700" : "text-gray-800"
                  } ${disableNonReliable && nonRel ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="font-medium">
                    {v.vendorCompany || v.vendorName || "(Unnamed)"}{" "}
                    {nonRel && (
                      <span className="inline-block text-[10px] ml-1 bg-red-600 text-white px-1 rounded">
                        NON-RELIABLE
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500">
                    {v.vendorName || ""} • {v.location || "-"} • {v.brandDealing || ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
