"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * SuggestedPriceCalculator
 *
 * Calculates a per‑unit “suggested selling price” by adding:
 *   • segment‑based margin
 *   • branding cost  (sum of selected brandingTypes)
 *   • per‑unit logistics cost (via backend /logistics/calculate)
 *
 * Props
 * ──────────────────────────────────────────────────────────────
 *  product: {
 *    productCost: number,   // base cost (required)
 *    quantity:    number,   // qty (>=1)
 *    weight:      number,   // single‑unit weight (kg)
 *    brandingTypes: string[] // array of brandingType _ids
 *  }
 *  companySegment:   string  // e.g. "Retail", "Corporate"   (required)
 *  companyPincode:   string  // 6‑digit destination pin      (required)
 *  brandingTypesList: array  // [{ _id, brandingName, cost }]
 *  segmentsList:      array  // [{ segmentName, priceQueries, quantityQueries }]
 *
 *  onPrice?: (number) => void  // optional callback – emits finalPrice whenever it changes
 */
export default function SuggestedPriceCalculator({
  product,
  companySegment,
  companyPincode,
  brandingTypesList,
  segmentsList,
  onPrice, // optional
}) {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const ORIGIN_PIN  = "560019"; // ship‑from pincode

  const [result, setResult] = useState(null);   // full breakdown
  const [error,  setError]  = useState("");

  /* ────────────────────────────────────────────────────────── */
  useEffect(() => {
    setError("");
    setResult(null);

    const run = async () => {
      /* basic validation  ----------------------------------- */
      const baseCost = parseFloat(product.productCost) || 0;
      const qty      = parseInt(product.quantity)      || 1;
      const wgt      = parseFloat(product.weight)      || 0;
      const destPin  = (companyPincode || "").trim();

      if (baseCost <= 0)   return setError("Valid product cost is required");
      if (qty < 1)         return setError("Quantity must be at least 1");
      if (wgt < 0)         return setError("Valid weight is required");
      if (!/^\d{6}$/.test(destPin))
        return setError("Valid 6‑digit destination pincode is required");
      if (!companySegment) return setError("Segment is required");
      if (!/^\d{6}$/.test(ORIGIN_PIN))
        return setError("Origin pincode mis‑configured");

      try {
        /* segment look‑up ----------------------------------- */
        const seg = segmentsList.find((s) => s.segmentName === companySegment);
        if (!seg) return setError("Selected segment not found");

        /* branding cost (per‑unit) --------------------------- */
        const brandingCost =
          Array.isArray(product.brandingTypes) &&
          product.brandingTypes.length
            ? product.brandingTypes.reduce((sum, id) => {
                const bt = brandingTypesList.find((b) => b._id === id);
                return sum + (bt ? parseFloat(bt.cost) || 0 : 0);
              }, 0)
            : 0;

        /* logistic cost (per‑unit) --------------------------- */
        const totalWeight = wgt * qty;
        const { data } = await axios.get(`${BACKEND_URL}/api/logistics/calculate`, {
          params: {
            originPincode: ORIGIN_PIN,
            destPincode : destPin,
            weight       : totalWeight,
          },
        });
        const perUnitLogistics = (parseFloat(data.cost) || 0) / qty;

        /* margin % ------------------------------------------- */
        const priceIdx = seg.priceQueries.findIndex(
          (q) => baseCost >= q.from && baseCost <= q.to
        );
        let marginPct = 0;
        if (priceIdx !== -1) {
          const qtySlab = seg.quantityQueries.find(
            (q) => qty >= q.fromQty && qty <= q.toQty
          );
          const adjIdx  =
            priceIdx +
            (qtySlab ? parseInt(qtySlab.operation || 0, 10) : 0);

          const finalIdx = Math.min(
            seg.priceQueries.length - 1,
            Math.max(0, adjIdx)
          );
          marginPct = seg.priceQueries[finalIdx]?.margin || 0;
        }

        const marginAmt = baseCost * (marginPct / 100);
        const finalPrice = parseFloat(
          (baseCost + marginAmt + brandingCost + perUnitLogistics).toFixed(2)
        );

        /* callback for parent ------------------------------- */
        if (typeof onPrice === "function") onPrice(finalPrice);

        /* save breakdown ------------------------------------ */
        setResult({
          baseCost          : baseCost,
          marginPct         : marginPct,
          marginAmount      : parseFloat(marginAmt.toFixed(2)),
          logisticsCost     : parseFloat(perUnitLogistics.toFixed(2)),
          brandingCost      : parseFloat(brandingCost.toFixed(2)),
          finalPrice        : finalPrice,
        });
      } catch (err) {
        console.error("SuggestedPriceCalculator:", err);
        setError(
          err.response?.data?.message ||
            "Calculation failed. Check logistics API."
        );
      }
    };

    run();
  }, [
    product,
    companySegment,
    companyPincode,
    brandingTypesList,
    segmentsList,
    onPrice,
  ]);

  /* ────────────────────────────────────────────────────────── */
  if (error) return <span className="text-red-600 text-xs">{error}</span>;
  if (!result)
    return <span className="text-gray-600 text-xs">Calculating&hellip;</span>;

  return (
    <div className="flex items-center space-x-2">
      <span className="text-green-600 text-xs">₹{result.finalPrice}</span>

      {/* info tooltip */}
      <span className="relative group">
        <button className="w-4 h-4 text-xs text-white bg-purple-600 rounded-full flex items-center justify-center">
          i
        </button>

        <div className="absolute left-5 top-0 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-10 w-56">
        <ul>
            <li>Base Cost: ₹{result.baseCost.toFixed(2)}</li>
            
            <li>Logistics: ₹{result.logisticsCost.toFixed(2)}</li>
            <li>Branding: ₹{result.brandingCost.toFixed(2)}</li>
            
            <li className="font-semibold mt-1">
              Total: ₹{result.finalPrice.toFixed(2)}
            </li>
            <li>
              Profit : ₹{result.marginAmount.toFixed(2)}
            </li>
          </ul>
        </div>
      </span>
    </div>
  );
}
