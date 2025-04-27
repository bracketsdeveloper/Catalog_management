import React, { useState } from "react";
import { format } from "date-fns";

export default function SampleOutTable({ data, onEdit }) {
  const [preview, setPreview] = useState(null);

  return (
    <>
      <div className="overflow-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Out Date","Company","Client","Sent By","Sample Ref","Picture",
                "Product","Brand","Qty","Color","Status","Received Back","Out Since","Actions"
              ].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(so => (
              <tr key={so._id}>
                <td className="px-3 py-2">{format(new Date(so.sampleOutDate),"dd/MM/yyyy")}</td>
                <td className="px-3 py-2">{so.clientCompanyName}</td>
                <td className="px-3 py-2">{so.clientName}</td>
                <td className="px-3 py-2">{so.sentByName}</td>
                <td className="px-3 py-2">{so.sampleReferenceCode}</td>
                <td className="px-3 py-2">
                  {so.productPicture
                    ? <img
                        src={so.productPicture}
                        alt=""
                        className="h-10 w-10 object-contain cursor-pointer"
                        onClick={() => setPreview(so.productPicture)}
                      />
                    : <div className="h-10 w-10 border flex items-center justify-center text-xs">No</div>
                  }
                </td>
                <td className="px-3 py-2">{so.productName}</td>
                <td className="px-3 py-2">{so.brand}</td>
                <td className="px-3 py-2">{so.qty}</td>
                <td className="px-3 py-2">{so.color}</td>
                <td className="px-3 py-2">{so.sampleOutStatus || "-"}</td>
                <td className="px-3 py-2">{so.receivedBack ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{so.outSince}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onEdit(so)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan="14" className="px-3 py-6 text-center text-gray-500">
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Image preview */}
      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 text-white text-xl"
            >×</button>
            <img
              src={preview}
              alt=""
              className="max-h-[80vh] max-w-[80vw] object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
}
