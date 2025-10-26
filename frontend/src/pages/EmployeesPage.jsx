// src/pages/hrms/EmployeesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import FiltersBar from "../components/common/FiltersBar";
import { HRMS } from "../api/hrmsClient";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import EmployeeModal from "../components/hrms/EmployeeModal.jsx";

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [dept, setDept] = useState("");
  const [active, setActive] = useState("true");

  const [createOpen, setCreateOpen] = useState(false);
  const fileInputRef = useRef(null);

  const refresh = () => {
    HRMS.listEmployees({ q, role, dept, active, limit: 200 })
      .then((r) => setRows(r.data.rows || []))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    refresh();
  }, [q, role, dept, active]);

  const displayed = useMemo(() => rows, [rows]);

  /* ----------------------------- TEMPLATE ----------------------------- */
  const downloadTemplate = () => {
    const headers = [
      "employeeId",
      "name",
      "dob(YYYY-MM-DD)",
      "address",
      "phone",
      "emergencyPhone",
      "aadhar",
      "bloodGroup",
      "dateOfJoining(YYYY-MM-DD)",
      "medicalIssues",
      "role",
      "department",
      "laptopSerial",
      "mobileImei",
      "mobileNumber",
      "idCardsIssued(true/false)",
      "bankName",
      "bankAccountNumber",
      "currentCTC",
      "currentTakeHome",
      "lastRevisedSalaryAt(YYYY-MM-DD)",
      "nextAppraisalOn(YYYY-MM-DD)"
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "EmployeesTemplate");
    XLSX.writeFile(wb, "HRMS_Employees_Template.xlsx");
  };

  /* --------------------------- BULK UPLOAD ---------------------------- */
  const handleBulkUploadClick = () => fileInputRef.current?.click();

  const handleBulkFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" }); // rows as objects

      if (!json.length) {
        toast.warn("No rows found in uploaded file.");
        return;
      }

      // Map each row -> payload for API
      const toDate = (v) => (v ? new Date(v) : undefined);
      const toBool = (v) => String(v).toLowerCase() === "true";
      const toNum = (v) => (v === "" || v === null ? undefined : Number(v));

      const payloads = json.map((r, idx) => {
        const employeeId = String(r["employeeId"] || "").trim();
        const name = String(r["name"] || "").trim();
        if (!employeeId || !name) {
          throw new Error(`Row ${idx + 2}: 'employeeId' and 'name' are required.`);
        }
        return {
          personal: {
            employeeId,
            name,
            dob: r["dob(YYYY-MM-DD)"] ? toDate(r["dob(YYYY-MM-DD)"]) : undefined,
            address: r["address"] || "",
            phone: r["phone"] || "",
            emergencyPhone: r["emergencyPhone"] || "",
            aadhar: r["aadhar"] || "",
            bloodGroup: r["bloodGroup"] || "",
            dateOfJoining: r["dateOfJoining(YYYY-MM-DD)"]
              ? toDate(r["dateOfJoining(YYYY-MM-DD)"])
              : undefined,
            medicalIssues: r["medicalIssues"] || ""
          },
          org: {
            role: r["role"] || "",
            department: r["department"] || ""
          },
          assets: {
            laptopSerial: r["laptopSerial"] || "",
            mobileImei: r["mobileImei"] || "",
            mobileNumber: r["mobileNumber"] || "",
            idCardsIssued: toBool(r["idCardsIssued(true/false)"])
          },
          financial: {
            bankName: r["bankName"] || "",
            bankAccountNumber: r["bankAccountNumber"] || "",
            currentCTC: toNum(r["currentCTC"]),
            currentTakeHome: toNum(r["currentTakeHome"]),
            lastRevisedSalaryAt: r["lastRevisedSalaryAt(YYYY-MM-DD)"]
              ? toDate(r["lastRevisedSalaryAt(YYYY-MM-DD)"])
              : undefined,
            nextAppraisalOn: r["nextAppraisalOn(YYYY-MM-DD)"]
              ? toDate(r["nextAppraisalOn(YYYY-MM-DD)"])
              : undefined
          }
        };
      });

      toast.info(`Uploading ${payloads.length} employees...`);
      const results = await Promise.allSettled(payloads.map((p) => HRMS.upsertEmployee(p)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;

      if (ok) toast.success(`Uploaded ${ok} employee(s) successfully.`);
      if (fail) toast.error(`${fail} row(s) failed. Check data and retry.`);

      refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to process file.");
    } finally {
      // reset the input so selecting the same file again re-fires onChange
      e.target.value = "";
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Employees"
        actions={
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="px-3 py-1 text-xs rounded border"
            >
              Download Template
            </button>
            <button
              onClick={handleBulkUploadClick}
              className="px-3 py-1 text-xs rounded bg-indigo-600 text-white"
            >
              Bulk Upload
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
            >
              + Create Employee
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleBulkFile}
            />
          </div>
        }
      />

      <FiltersBar>
        <div>
          <div className="text-xs">Search</div>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs">Role</div>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs">Department</div>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs">Active</div>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </FiltersBar>

      <div className="overflow-x-auto border rounded">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left">Employee ID</th>
              <th className="border px-2 py-1 text-left">Name</th>
              <th className="border px-2 py-1 text-left">Role</th>
              <th className="border px-2 py-1 text-left">Department</th>
              <th className="border px-2 py-1 text-left">DOJ</th>
              <th className="border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((e) => (
              <tr key={e._id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{e.personal.employeeId}</td>
                <td className="border px-2 py-1">{e.personal.name}</td>
                <td className="border px-2 py-1">{e.org?.role || "-"}</td>
                <td className="border px-2 py-1">{e.org?.department || "-"}</td>
                <td className="border px-2 py-1">
                  {e.personal?.dateOfJoining?.slice?.(0, 10) || ""}
                </td>
                <td className="border px-2 py-1">
                  <Link
                    to={`/admin-dashboard/hrms/employees/${e.personal.employeeId}`}
                    className="text-blue-600 text-xs underline"
                  >
                    View / Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!displayed.length && (
              <tr>
                <td
                  className="border px-2 py-4 text-center text-sm text-gray-500"
                  colSpan={6}
                >
                  No employees
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <EmployeeModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
