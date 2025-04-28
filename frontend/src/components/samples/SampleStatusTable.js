// client/src/components/samples/SampleStatusTable.jsx
import React, { useState } from "react";

export default function SampleStatusTable({ samples, outs }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Group sample-outs by reference code
  const mapByRef = outs.reduce((acc, o) => {
    acc[o.sampleReferenceCode] = acc[o.sampleReferenceCode] || [];
    acc[o.sampleReferenceCode].push(o);
    return acc;
  }, {});

  // Format date to dd/MM/yyyy
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "-";

  // Build rows
  const rows = samples.map((s) => {
    const list     = mapByRef[s.sampleReferenceCode] || [];
    const totalOut = list.reduce((sum, o) => sum + Number(o.qty), 0);
    const totalRet = list.reduce((sum, o) => sum + Number(o.qtyReceivedBack), 0);
    const onHand   = s.qty - totalOut + totalRet;

    return {
      ...s,
      onHand,
    };
  });

  return (
    <>
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative">
            <button
              className="absolute top-2 right-2 text-2xl"
              onClick={() => setLightboxSrc(null)}
            >
              &times;
            </button>
            <img src={lightboxSrc} alt="" className="max-h-[80vh] max-w-[90vw]" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-sm font-semibold">
              {[
                "Ref Code",
                "Prod Code",
                "In Date",
                "Picture",
                "Name",
                "Category",
                "Sub Cat",
                "Brand",
                "Specs",
                "Color",
                "Vendor/Client",
                "Rate",
                "On-Hand Qty",
                "Returnable",
                "Days",
              ].map((h) => (
                <th key={h} className="p-2 border-b">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sampleReferenceCode} className="hover:bg-gray-50">
                <td className="p-2 border-b">{r.sampleReferenceCode}</td>
                <td className="p-2 border-b">{r.productId}</td>
                <td className="p-2 border-b">{fmt(r.sampleInDate)}</td>
                <td className="p-2 border-b">
                  {r.productPicture ? (
                    <img
                      src={r.productPicture}
                      alt=""
                      className="h-12 w-12 object-contain cursor-pointer"
                      onClick={() => setLightboxSrc(r.productPicture)}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2 border-b">{r.productName}</td>
                <td className="p-2 border-b">{r.category}</td>
                <td className="p-2 border-b">{r.subCategory}</td>
                <td className="p-2 border-b">{r.brandName}</td>
                <td className="p-2 border-b">{r.productDetails}</td>
                <td className="p-2 border-b">{r.color}</td>
                <td className="p-2 border-b">{r.fromVendorClient}</td>
                <td className="p-2 border-b">{r.sampleRate}</td>
                <td className="p-2 border-b">{r.onHand}</td>
                <td className="p-2 border-b">{r.returnable}</td>
                <td className="p-2 border-b">{r.returnableDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
