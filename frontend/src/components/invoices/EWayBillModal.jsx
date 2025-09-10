import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const ddmmyyyy = (d = new Date()) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const extractPinFromText = (s = "") => {
  const m = String(s).match(/\b(\d{6})\b/);
  return m ? m[1] : "";
};

async function geocodePin(pin) {
  // Nominatim (OpenStreetMap) geocoding
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    `${pin} India`
  )}&limit=1`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error("Nominatim failed");
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) throw new Error("Pin not found");
  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
  };
}

async function osrmDistanceKm(a, b) {
  // OSRM routing (no API key)
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&alternatives=false&steps=false`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error("OSRM failed");
  const data = await r.json();
  const meters = data?.routes?.[0]?.distance;
  if (!meters && meters !== 0) throw new Error("OSRM no route");
  return Math.round((meters / 1000) * 100) / 100; // km, 2 decimals
}

function HStack({ children, className = "" }) {
  return <div className={`flex items-center gap-2 ${className}`}>{children}</div>;
}

export default function EWayBillModal({
  open,
  onClose,
  invoiceId,
  irn,
  refJson,
  shipToText,
  onGenerated, // (eInvoice, invoice) => void
}) {
  const [loading, setLoading] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Pins: source from e-invoice reference (Dispatch/Seller); destination from ShipTo text
  const initialSourcePin =
    (refJson?.DispDtls?.Pin && String(refJson.DispDtls.Pin)) ||
    (refJson?.SellerDtls?.Pin && String(refJson.SellerDtls.Pin)) ||
    "";
  const initialDestPin = extractPinFromText(shipToText || "");

  const [sourcePin, setSourcePin] = useState(initialSourcePin);
  const [destPin, setDestPin] = useState(initialDestPin);
  const [distanceKm, setDistanceKm] = useState("");
  const [transMode, setTransMode] = useState("1"); // 1=Road,2=Rail,3=Air,4=Ship
  const [vehNo, setVehNo] = useState("");
  const [vehType, setVehType] = useState("R"); // R=Regular,O=Over-dimensional
  const [transId, setTransId] = useState(""); // transporter id/GSTIN
  const [transName, setTransName] = useState("");
  const [transDocNo, setTransDocNo] = useState("");
  const [transDocDt, setTransDocDt] = useState(ddmmyyyy());

  // Build ExpShipDtls/DispDtls from refJson, with safe fallbacks
  const ExpShipDtls = useMemo(
    () => ({
      Addr1: refJson?.ShipDtls?.Addr1 || "",
      Addr2: refJson?.ShipDtls?.Addr2 || "",
      Loc: refJson?.ShipDtls?.Loc || "",
      Pin: Number(refJson?.ShipDtls?.Pin || extractPinFromText(shipToText || "") || 0) || undefined,
      Stcd: String(refJson?.ShipDtls?.Stcd || ""),
    }),
    [refJson, shipToText]
  );

  const DispDtls = useMemo(
    () => ({
      Nm: refJson?.DispDtls?.Nm || refJson?.SellerDtls?.LglNm || "",
      Addr1: refJson?.DispDtls?.Addr1 || refJson?.SellerDtls?.Addr1 || "",
      Addr2: refJson?.DispDtls?.Addr2 || refJson?.SellerDtls?.Addr2 || "",
      Loc: refJson?.DispDtls?.Loc || refJson?.SellerDtls?.Loc || "",
      Pin: Number(
        refJson?.DispDtls?.Pin || refJson?.SellerDtls?.Pin || sourcePin || 0
      ) || undefined,
      Stcd: String(refJson?.DispDtls?.Stcd || refJson?.SellerDtls?.Stcd || ""),
    }),
    [refJson, sourcePin]
  );

  useEffect(() => {
    if (!open) return;
    setMsg("");
    setSourcePin(initialSourcePin);
    setDestPin(initialDestPin);
    setDistanceKm("");
    // Auto-compute on open (if both pins present)
    if (initialSourcePin && initialDestPin) {
      (async () => {
        try {
          setDistanceLoading(true);
          const A = await geocodePin(initialSourcePin);
          const B = await geocodePin(initialDestPin);
          const km = await osrmDistanceKm(A, B);
          setDistanceKm(String(km));
        } catch (e) {
          setMsg("Auto distance lookup failed. You can enter it manually.");
        } finally {
          setDistanceLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const recalcDistance = async () => {
    if (!(sourcePin && destPin)) {
      setMsg("Please provide both source and destination pincodes.");
      return;
    }
    try {
      setMsg("");
      setDistanceLoading(true);
      const A = await geocodePin(sourcePin);
      const B = await geocodePin(destPin);
      const km = await osrmDistanceKm(A, B);
      setDistanceKm(String(km));
    } catch (e) {
      setMsg("Recalculation failed. Enter distance manually if needed.");
    } finally {
      setDistanceLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      if (!irn) {
        setMsg("IRN is required before generating e-way bill.");
        return;
      }
      const dist = Number(distanceKm);
      if (!Number.isFinite(dist) || dist <= 0) {
        setMsg("Please provide a valid distance (km).");
        return;
      }
      if (!transDocNo) return setMsg("Transport Document Number is required.");
      if (!vehNo) return setMsg("Vehicle number is required.");

      setLoading(true);
      setMsg("Generating E-Way Bill…");

      const payload = {
        Irn: irn,
        Distance: Math.round(dist),
        TransMode: transMode,
        TransId: transId || undefined,
        TransName: transName || undefined,
        TransDocDt: transDocDt || ddmmyyyy(),
        TransDocNo: transDocNo,
        VehNo: vehNo.toUpperCase().replace(/\s+/g, ""),
        VehType: vehType,
        ExpShipDtls,
        DispDtls,
      };

      const { data } = await axios.post(
        `${BACKEND}/api/admin/invoices/${invoiceId}/einvoice/ewaybill/generate`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      onGenerated?.(data?.eInvoice, data?.invoice);
      setMsg(data?.message || "E-Way Bill generated");
      onClose?.();
    } catch (e) {
      setMsg(
        e?.response?.data?.status_desc ||
          e?.response?.data?.message ||
          "Failed to generate E-Way Bill"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-base font-semibold">Generate E-Way Bill</div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded border hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 text-xs space-y-4">
          {msg && (
            <div className="px-3 py-2 rounded border bg-amber-50 text-amber-900">
              {msg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Pins + Distance */}
            <div className="border rounded p-3 space-y-2">
              <div className="font-semibold">Route</div>
              <HStack>
                <label className="w-28 text-gray-600">Source PIN</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={sourcePin}
                  onChange={(e) => setSourcePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 560052"
                />
              </HStack>
              <HStack>
                <label className="w-28 text-gray-600">Destination PIN</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={destPin}
                  onChange={(e) => setDestPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 560001"
                />
              </HStack>
              <HStack>
                <label className="w-28 text-gray-600">Distance (km)</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="auto or enter manually"
                />
                <button
                  onClick={recalcDistance}
                  disabled={distanceLoading}
                  className="px-3 py-1 text-xs rounded border hover:bg-gray-100 disabled:opacity-60"
                >
                  {distanceLoading ? "Calculating…" : "Recalculate"}
                </button>
              </HStack>
            </div>

            {/* Transport details */}
            <div className="border rounded p-3 space-y-2">
              <div className="font-semibold">Transport</div>
              <HStack>
                <label className="w-36 text-gray-600">Mode</label>
                <select
                  className="border p-1 rounded flex-1"
                  value={transMode}
                  onChange={(e) => setTransMode(e.target.value)}
                >
                  <option value="1">Road</option>
                  <option value="2">Rail</option>
                  <option value="3">Air</option>
                  <option value="4">Ship</option>
                </select>
              </HStack>

              <HStack>
                <label className="w-36 text-gray-600">Vehicle No</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={vehNo}
                  onChange={(e) => setVehNo(e.target.value)}
                  placeholder="KA12ER1234"
                />
              </HStack>

              <HStack>
                <label className="w-36 text-gray-600">Vehicle Type</label>
                <select
                  className="border p-1 rounded flex-1"
                  value={vehType}
                  onChange={(e) => setVehType(e.target.value)}
                >
                  <option value="R">Regular</option>
                  <option value="O">Over-dimensional</option>
                </select>
              </HStack>

              <HStack>
                <label className="w-36 text-gray-600">Transporter ID</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={transId}
                  onChange={(e) => setTransId(e.target.value)}
                  placeholder="GSTIN (optional)"
                />
              </HStack>

              <HStack>
                <label className="w-36 text-gray-600">Transporter Name</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={transName}
                  onChange={(e) => setTransName(e.target.value)}
                  placeholder="Optional"
                />
              </HStack>

              <HStack>
                <label className="w-36 text-gray-600">Trans Doc No</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={transDocNo}
                  onChange={(e) => setTransDocNo(e.target.value)}
                  placeholder="e.g. INV/TD/001"
                />
              </HStack>

              <HStack>
                <label className="w-36 text-gray-600">Trans Doc Date</label>
                <input
                  className="border p-1 rounded flex-1"
                  value={transDocDt}
                  onChange={(e) => setTransDocDt(e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              </HStack>
            </div>

            {/* Dispatch Details (read-only) */}
            <div className="border rounded p-3 space-y-1 col-span-2">
              <div className="font-semibold">Dispatch / Shipping (from reference)</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600">Dispatch Name</div>
                <div>{DispDtls.Nm || "—"}</div>
                <div className="text-gray-600">Dispatch Addr</div>
                <div>
                  {[DispDtls.Addr1, DispDtls.Addr2, DispDtls.Loc].filter(Boolean).join(", ")}{" "}
                  {DispDtls.Pin ? `- ${DispDtls.Pin}` : ""}
                </div>

                <div className="text-gray-600">Ship Addr</div>
                <div>
                  {[ExpShipDtls.Addr1, ExpShipDtls.Addr2, ExpShipDtls.Loc].filter(Boolean).join(", ")}{" "}
                  {ExpShipDtls.Pin ? `- ${ExpShipDtls.Pin}` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-xs">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 text-white rounded text-xs disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate E-Way Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}
