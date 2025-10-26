// src/components/common/ExportButton.jsx
export default function ExportButton({ onClick, label = "Export to Excel" }) {
    return (
      <button onClick={onClick} className="px-3 py-1 text-xs rounded bg-blue-600 text-white">
        {label}
      </button>
    );
  }
  