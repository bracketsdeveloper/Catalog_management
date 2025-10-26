// src/components/common/PageHeader.jsx
export default function PageHeader({ title, actions }) {
    return (
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex gap-2">{actions}</div>
      </div>
    );
  }
  