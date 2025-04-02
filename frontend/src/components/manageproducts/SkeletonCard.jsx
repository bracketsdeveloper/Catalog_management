import React from "react";

export default function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded animate-pulse">
      <div className="bg-gray-200 h-40 w-full rounded mb-4"></div>
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-32 mt-4"></div>
    </div>
  );
}
