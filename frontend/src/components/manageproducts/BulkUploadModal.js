import React from 'react';

export default function BulkUploadModal({
  onClose,
  getRootProps,
  getInputProps,
  handleDownloadTemplate,
  processBulkUpload,
  csvData
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Bulk Product Upload</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-purple-500 text-white rounded mb-4 hover:bg-purple-600"
          >
            Download Template
          </button>
          
          <div
            {...getRootProps()}
            className="p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 text-center"
          >
            <input {...getInputProps()} />
            <p className="text-gray-600">
              Drag & drop CSV/Excel file here, or click to select
            </p>
            {csvData.length > 0 && (
              <p className="text-sm text-green-600 mt-2">
                {csvData.length} products ready to upload
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              processBulkUpload();
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={csvData.length === 0}
          >
            Upload {csvData.length > 0 && `(${csvData.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}