import React from "react";
import ProductCard from "./ProductCard";
import SkeletonLoader from "./SkeletonLoader";

export default function ProductList({ products, loading, handleEdit, handleDelete }) {
  return loading ? (
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonLoader key={i} />
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} handleEdit={handleEdit} handleDelete={handleDelete} />
      ))}
    </div>
  );
}
