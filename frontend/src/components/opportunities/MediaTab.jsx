// ../components/opportunities/MediaTab.jsx
import React from "react";

export default function MediaTab({ mediaItems, setMediaItems }) {
  const handleAddMedia = () => {
    setMediaItems((prev) => [
      ...prev,
      {
        mediaCode: "Auto-generated",
        file: null, 
        mediaName: "",
        contentType: "",
        description: "",
      },
    ]);
  };

  const handleRemoveMedia = (index) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setMediaItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-6 gap-4 mb-2 text-blue-900 text-sm font-semibold">
        <div>Media Code</div>
        <div>Media File *</div>
        <div>Media Name *</div>
        <div>Content Type *</div>
        <div>Description</div>
        <div>Delete</div>
      </div>

      {mediaItems.map((md, index) => (
        <div
          key={index}
          className="grid grid-cols-6 gap-4 items-center bg-gray-50 p-2 mb-2 rounded"
        >
          {/* Media Code */}
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm bg-gray-100"
            value={md.mediaCode}
            readOnly
          />

          {/* Media File */}
          <div>
            <input
              type="file"
              onChange={(e) =>
                handleChange(index, "file", e.target.files?.[0] || null)
              }
              className="text-sm"
            />
            <span className="text-xs text-gray-500 block mt-1">
              {md.file ? md.file.name : "No file chosen"}
            </span>
          </div>

          {/* Media Name */}
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Media Name"
            value={md.mediaName}
            onChange={(e) => handleChange(index, "mediaName", e.target.value)}
          />

          {/* Content Type */}
          <select
            className="border rounded px-2 py-1 text-sm"
            value={md.contentType}
            onChange={(e) => handleChange(index, "contentType", e.target.value)}
          >
            <option value="">Select Content Type</option>
            <option value="Image">Image</option>
            <option value="Document">Document</option>
            <option value="Video">Video</option>
          </select>

          {/* Description */}
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Description"
            value={md.description}
            onChange={(e) => handleChange(index, "description", e.target.value)}
          />

          {/* Delete */}
          <button
            onClick={() => handleRemoveMedia(index)}
            className="text-red-600 hover:text-red-800 text-xl"
          >
            &#10060;
          </button>
        </div>
      ))}

      {mediaItems.length === 0 && (
        <div className="text-sm text-gray-500 italic mb-2">
          No media added.
        </div>
      )}

      <button
        onClick={handleAddMedia}
        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm"
      >
        + Add Media
      </button>
    </div>
  );
}
