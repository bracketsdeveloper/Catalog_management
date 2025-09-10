import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "";
}
function fmtAmt(n) {
  if (n === null || n === undefined || n === "") return "";
  const x = Number(n);
  if (isNaN(x)) return n;
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicesTable({ data = [], loading }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState({ key: "invoiceDetails.date", dir: "desc" });
  const [colFilters, setColFilters] = useState({});

  const cols = useMemo(
    () => [
      { key: "invoiceDetails.invoiceNumber", name: "Invoice #", w: "w-24" },
      { key: "invoiceDetails.date", name: "Date", w: "w-20", render: (v) => fmtDate(v) },
      { key: "clientCompanyName", name: "Client Company", w: "w-32" }, // slimmer as requested
      { key: "clientName", name: "Client Name", w: "w-28" },
      { key: "invoiceDetails.refJobSheetNumber", name: "Ref. JS", w: "w-20" },
      { key: "invoiceDetails.quotationRefNumber", name: "Quote Ref", w: "w-24" },
      { key: "invoiceDetails.quotationDate", name: "Quote Date", w: "w-20", render: (v) => fmtDate(v) },
    //   { key: "invoiceDetails.clientOrderIdentification", name: "Client Order ID", w: "w-28" },
      { key: "invoiceDetails.eWayBillNumber", name: "E-Way Bill #", w: "w-24" },
    //   { key: "grandTotal", name: "Grand Total", w: "w-24", render: fmtAmt },
      { key: "createdBy", name: "Created By", w: "w-28" },
      { key: "_actions", name: "Actions", w: "w-24" },
    ],
    []
  );

  const get = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

  const filtered = useMemo(() => {
    let list = [...data];
    Object.entries(colFilters).forEach(([key, val]) => {
      if (!val) return;
      const rx = new RegExp(String(val).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      list = list.filter((row) => rx.test(String(get(row, key) ?? "")));
    });
    return list;
  }, [data, colFilters]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    const list = [...filtered].sort((a, b) => {
      const av = get(a, key);
      const bv = get(b, key);
      const an = Number(av), bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) return (an - bn) * factor;
      const ad = new Date(av).getTime(), bd = new Date(bv).getTime();
      if (!isNaN(ad) && !isNaN(bd)) return (ad - bd) * factor;
      return String(av ?? "").localeCompare(String(bv ?? "")) * factor;
    });
    return list;
  }, [filtered, sort]);

  const toggleSort = (key) => {
    if (key === "_actions") return;
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  return (
    <div className="border border-gray-300 rounded">
      {/* table-fixed + tight widths to avoid horizontal scroll */}
      <table className="table-fixed w-full text-[11px] whitespace-nowrap">
        <thead>
          <tr className="bg-gray-50">
            {cols.map((c) => (
              <th
                key={c.key}
                className={`px-2 py-1 border text-left align-bottom ${c.w} overflow-hidden`}
                style={{ maxWidth: "0" }}
              >
                <div
                  onClick={() => toggleSort(c.key)}
                  className={`flex items-center space-x-1 select-none ${
                    c.key !== "_actions" ? "cursor-pointer" : ""
                  }`}
                  title={c.key !== "_actions" ? "Sort" : undefined}
                >
                  <span className="truncate">{c.name}</span>
                  {sort.key === c.key && <span>{sort.dir === "asc" ? "↑" : "↓"}</span>}
                </div>
                {c.key !== "_actions" && (
                  <input
                    className="mt-1 w-full px-1 py-0.5 text-[11px] border rounded truncate"
                    placeholder="Filter…"
                    value={colFilters[c.key] || ""}
                    onChange={(e) => setColFilters({ ...colFilters, [c.key]: e.target.value })}
                    title={colFilters[c.key] || ""}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="px-2 py-3 border text-center" colSpan={cols.length}>
                Loading…
              </td>
            </tr>
          )}
          {!loading && sorted.length === 0 && (
            <tr>
              <td className="px-2 py-3 border text-center" colSpan={cols.length}>
                No invoices found
              </td>
            </tr>
          )}
          {!loading &&
            sorted.map((inv) => (
              <tr key={inv._id} className="hover:bg-gray-50">
                {cols.map((c) => {
                  if (c.key === "_actions") {
                    return (
                      <td key={c.key} className={`px-2 py-1 border ${c.w}`}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin-dashboard/invoices/${inv._id}/edit`)}
                            className="px-2 py-0.5 border rounded hover:bg-gray-100"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    );
                  }
                  const raw = get(inv, c.key);
                  const val = c.render ? c.render(raw, inv) : raw ?? "";
                  const text = typeof val === "string" ? val : String(val);
                  return (
                    <td
                      key={c.key}
                      className={`px-2 py-1 border ${c.w} overflow-hidden`}
                      style={{ maxWidth: "0" }}
                      title={text}
                    >
                      <span className="block truncate">{text}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
