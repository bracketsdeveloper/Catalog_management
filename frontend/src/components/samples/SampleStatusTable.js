import React from "react";

export default function SampleStatusTable({ samples, outs }) {
  // group outs by reference code for quick lookup
  const mapByRef = outs.reduce((acc, o) => {
    const ref = o.sampleReferenceCode;
    if (!acc[ref]) acc[ref] = [];
    acc[ref].push(o);
    return acc;
  }, {});

  // helper to format dd/MM/yyyy
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const rows = samples.map((s) => {
    const list = mapByRef[s.sampleReferenceCode] || [];
    const totalOut = list.reduce((sum, o) => sum + Number(o.qty), 0);
    const totalRet = list.reduce((sum, o) => sum + Number(o.qtyReceivedBack), 0);
    const onHand   = s.qty - totalOut + totalRet;

    return {
      ref:       s.sampleReferenceCode,
      code:      s.productId,
      inDate:    s.sampleInDate,
      picture:   s.productPicture,
      name:      s.productName,
      category:  s.category,
      subCat:    s.subCategory,
      brand:     s.brandName,
      specs:     s.productDetails,
      color:     s.color,
      vendor:    s.fromVendorClient,
      rate:      s.sampleRate,
      qty:       onHand,
      returnable: s.returnable,
      days:      s.days,
    };
  });

  return (
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
            <tr key={r.ref} className="hover:bg-gray-50">
              <td className="p-2 border-b">{r.ref}</td>
              <td className="p-2 border-b">{r.code}</td>
              <td className="p-2 border-b">{fmt(r.inDate)}</td>
              <td className="p-2 border-b">
                {r.picture ? (
                  <img
                    src={r.picture}
                    alt=""
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  "-"
                )}
              </td>
              <td className="p-2 border-b">{r.name}</td>
              <td className="p-2 border-b">{r.category}</td>
              <td className="p-2 border-b">{r.subCat}</td>
              <td className="p-2 border-b">{r.brand}</td>
              <td className="p-2 border-b">{r.specs}</td>
              <td className="p-2 border-b">{r.color}</td>
              <td className="p-2 border-b">{r.vendor}</td>
              <td className="p-2 border-b">{r.rate}</td>
              <td className="p-2 border-b">{r.qty}</td>
              <td className="p-2 border-b">{r.returnable}</td>
              <td className="p-2 border-b">{r.days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
