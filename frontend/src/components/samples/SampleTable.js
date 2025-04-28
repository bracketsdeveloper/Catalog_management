/*********************************************************************/
/*  client/src/components/samples/SampleTable.jsx                    */
/*********************************************************************/
"use client";

import React, { useState } from "react";
import { format }          from "date-fns";

export default function SampleTable({ samples, onEdit }) {
  const [preview, setPreview] = useState(null);

  return (
    <>
      <div className="overflow-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Date","Picture","Ref Code","Product ID","Name","Category",
                "SubCat","Brand","Rate","Qty","Returnable","Actions"
              ].map(h=>(
                <th key={h}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {samples.map(s=>(
              <tr key={s._id}>
                <td className="px-4 py-2 text-sm">
                  {format(new Date(s.sampleInDate),"dd/MM/yyyy")}
                </td>

                {/* image */}
                <td className="px-4 py-2">
                  {s.productPicture
                    ? <img
                        src={s.productPicture}
                        alt={s.productName || s.productId}
                        className="h-12 w-12 object-contain border cursor-pointer"
                        onClick={()=>setPreview(s.productPicture)}
                      />
                    : <div className="h-12 w-12 flex items-center justify-center border text-gray-400 text-xs">
                        No<br/>Img
                      </div>}
                </td>

                <td className="px-4 py-2 text-sm">{s.sampleReferenceCode}</td>
                <td className="px-4 py-2 text-sm">{s.productId}</td>
                <td className="px-4 py-2 text-sm">{s.productName}</td>
                <td className="px-4 py-2 text-sm">{s.category}</td>
                <td className="px-4 py-2 text-sm">{s.subCategory}</td>
                <td className="px-4 py-2 text-sm">{s.brandName}</td>
                <td className="px-4 py-2 text-sm">{s.sampleRate}</td>
                <td className="px-4 py-2 text-sm">{s.qty}</td>
                <td className="px-4 py-2 text-sm">
                  {s.returnable}
                  {s.returnable==="Returnable" && ` (${s.returnableDays} d)`}
                </td>

                <td className="px-4 py-2 text-sm">
                  <button
                    onClick={()=>onEdit(s)}
                    className="text-blue-600 hover:underline"
                  >Edit</button>
                </td>
              </tr>
            ))}

            {!samples.length && (
              <tr>
                <td colSpan="12"
                    className="px-4 py-6 text-center text-sm text-gray-500">
                  No samples found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- image light-box */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative">
            <button
              onClick={()=>setPreview(null)}
              className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-50 rounded-full p-1 hover:bg-opacity-75">
              ×
            </button>
            <img
              src={preview}
              alt="Preview"
              className="max-h-[80vh] max-w-[90vw] object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
}
