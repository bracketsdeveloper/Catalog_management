// src/components/common/Badge.jsx
export default function Badge({ color = "gray", children }) {
    const map = {
      gray: "bg-gray-100 text-gray-700",
      green: "bg-green-100 text-green-700",
      yellow: "bg-yellow-100 text-yellow-700",
      red: "bg-red-100 text-red-700",
      blue: "bg-blue-100 text-blue-700",
    };
    return <span className={`px-2 py-0.5 text-[11px] rounded ${map[color]}`}>{children}</span>;
  }
  