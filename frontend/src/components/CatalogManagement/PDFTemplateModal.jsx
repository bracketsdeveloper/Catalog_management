import React from "react";
import { templateConfig } from "../CatalogManagement/constants";

export default function PDFTemplateModal({ onSelect, onClose }) {
  // If templateConfig is undefined or null, render an error message.
  if (!templateConfig) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
          <h2 className="text-lg font-bold mb-4 text-center">
            No PDF Templates Found
          </h2>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
        <h2 className="text-lg font-bold mb-4 text-center">
          Select PDF Template
        </h2>
        <div className="flex justify-center space-x-4 mb-4">
          {Object.keys(templateConfig).map((templateId) => (
            <div
              key={templateId}
              className="cursor-pointer text-center"
              onClick={() => onSelect(templateId)}
            >
              <img
                src={`/templates/template${templateId}/preview.png`}
                alt={`Template ${templateId}`}
                className="w-32 h-32 object-cover border rounded"
              />
              <div className="mt-2">Template {templateId}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
