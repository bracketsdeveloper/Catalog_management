import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import FiltersBar from "../components/common/FiltersBar";
import { HRMS } from "../api/hrmsClient";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import EmployeeModal from "../components/hrms/EmployeeModal.jsx";

/* Small helpers */
function fmtISO(d) {
  if (!d) return "";
  try {
    const x = new Date(d);
    if (Number.isNaN(+x)) return "";
    return x.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function clampStr(v) {
  return (v || "").toString().trim();
}

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);

  /* filters */
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [dept, setDept] = useState("");
  const [active, setActive] = useState("true");
  const [dojFrom, setDojFrom] = useState("");
  const [dojTo, setDojTo] = useState("");
  const [hasBiometric, setHasBiometric] = useState(""); // "", "yes", "no"
  const [hasMappedUser, setHasMappedUser] = useState(""); // "", "yes", "no"

  /* sorting */
  const [sortBy, setSortBy] = useState("personal.name"); // default A-Z by name
  const [dir, setDir] = useState("asc");

  /* modals */
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fileInputRef = useRef(null);

  /* fetch */
  const refresh = () => {
    HRMS.listEmployees({ q, role, dept, active, limit: 200, sortBy, dir })
      .then((r) => setRows(r.data.rows || []))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, dept, active, sortBy, dir]);

  /* client-side post filters (fields not supported by API yet) */
  const displayed = useMemo(() => {
    let out = rows || [];

    if (dojFrom) {
      out = out.filter((e) => {
        const d = e?.personal?.dateOfJoining;
        return d && fmtISO(d) >= dojFrom;
      });
    }
    if (dojTo) {
      out = out.filter((e) => {
        const d = e?.personal?.dateOfJoining;
        return d && fmtISO(d) <= dojTo;
      });
    }
    if (hasBiometric === "yes") {
      out = out.filter((e) => clampStr(e?.biometricId).length > 0);
    } else if (hasBiometric === "no") {
      out = out.filter((e) => !clampStr(e?.biometricId).length);
    }
    if (hasMappedUser === "yes") {
      out = out.filter((e) => !!e?.mappedUser);
    } else if (hasMappedUser === "no") {
      out = out.filter((e) => !e?.mappedUser);
    }

    return out;
  }, [rows, dojFrom, dojTo, hasBiometric, hasMappedUser]);

  /* template download */
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
      "nextAppraisalOn(YYYY-MM-DD)",
      "biometricId",
      "mappedUser(ObjectId)"
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "EmployeesTemplate");
    XLSX.writeFile(wb, "HRMS_Employees_Template.xlsx");
  };

  /* bulk upload */
  const handleBulkUploadClick = () => fileInputRef.current?.click();

  const handleBulkFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!json.length) {
        toast.warn("No rows found in uploaded file.");
        return;
      }

      const toDate = (v) => (v ? new Date(v) : undefined);
      const toBool = (v) => String(v).toLowerCase() === "true";
      const toNum = (v) => (v === "" || v === null ? undefined : Number(v));

      const payloads = json.map((r, idx) => {
        const employeeId = String(r["employeeId"] || "").trim();
        const name = String(r["name"] || "").trim();
        if (!employeeId || !name) {
          throw new Error(`Row ${idx + 2}: 'employeeId' and 'name' are required.`);
        }
        const mappedUser = r["mappedUser(ObjectId)"] ? String(r["mappedUser(ObjectId)"]).trim() : undefined;

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
            dateOfJoining: r["dateOfJoining(YYYY-MM-DD)"] ? toDate(r["dateOfJoining(YYYY-MM-DD)"]) : undefined,
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
            lastRevisedSalaryAt: r["lastRevisedSalaryAt(YYYY-MM-DD)"] ? toDate(r["lastRevisedSalaryAt(YYYY-MM-DD)"]) : undefined,
            nextAppraisalOn: r["nextAppraisalOn(YYYY-MM-DD)"] ? toDate(r["nextAppraisalOn(YYYY-MM-DD)"]) : undefined
          },
          biometricId: r["biometricId"] || "",
          mappedUser
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
      e.target.value = "";
    }
  };

  /* delete row */
  const handleDelete = async (employeeId) => {
    if (!window.confirm("Delete this employee?")) return;
    try {
      await HRMS.deleteEmployee(employeeId);
      toast.success("Deleted");
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to delete");
    }
  };

  /* header sorting widgets */
  const SortHead = ({ label, field, className = "" }) => {
    const active = sortBy === field;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    const arrow = !active ? "↕" : dir === "asc" ? "↑" : "↓";
    return (
      <th
        className={`border px-2 py-1 text-left cursor-pointer select-none ${className}`}
        onClick={() => {
          setSortBy(field);
          setDir(nextDir);
        }}
        title={`Sort by ${label} (${nextDir})`}
      >
        <span className="inline-flex items-center gap-1">
          {label} <span className="text-gray-500 text-[10px]">{arrow}</span>
        </span>
      </th>
    );
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Employees"
        actions={
          <div className="flex gap-2">
            <button onClick={downloadTemplate} className="px-3 py-1 text-xs rounded border">
              Download Template
            </button>
            <button onClick={handleBulkUploadClick} className="px-3 py-1 text-xs rounded bg-indigo-600 text-white">
              Bulk Upload
            </button>
            <button
              onClick={() => {
                setCreateOpen(true);
                setEditing(null);
              }}
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

      {/* Filters */}
      <FiltersBar>
        <div>
          <div className="text-xs">Search</div>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name, phone, role…"
          />
        </div>
        <div>
          <div className="text-xs">Role</div>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Designer"
          />
        </div>
        <div>
          <div className="text-xs">Department</div>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            placeholder="e.g. Operations"
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

        <div>
          <div className="text-xs">DOJ From</div>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={dojFrom}
            onChange={(e) => setDojFrom(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs">DOJ To</div>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={dojTo}
            onChange={(e) => setDojTo(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs">Biometric</div>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={hasBiometric}
            onChange={(e) => setHasBiometric(e.target.value)}
          >
            <option value="">Any</option>
            <option value="yes">Has ID</option>
            <option value="no">Missing</option>
          </select>
        </div>

        <div>
          <div className="text-xs">Mapped User</div>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={hasMappedUser}
            onChange={(e) => setHasMappedUser(e.target.value)}
          >
            <option value="">Any</option>
            <option value="yes">Mapped</option>
            <option value="no">Unmapped</option>
          </select>
        </div>
      </FiltersBar>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortHead label="Employee ID" field="personal.employeeId" />
              <SortHead label="Name" field="personal.name" />
              <SortHead label="Role" field="org.role" />
              <SortHead label="Department" field="org.department" />
              <SortHead label="DOJ" field="personal.dateOfJoining" />
              <SortHead label="Biometric ID" field="biometricId" />
              <th className="border px-2 py-1 text-left">Mapped User</th>
              <SortHead label="Active" field="isActive" className="w-20" />
              <th className="border px-2 py-1 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((e) => (
              <tr key={e._id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{e.personal.employeeId}</td>
                <td className="border px-2 py-1">{e.personal.name}</td>
                <td className="border px-2 py-1">{e.org?.role || "-"}</td>
                <td className="border px-2 py-1">{e.org?.department || "-"} </td>
                <td className="border px-2 py-1">
                  {e.personal?.dateOfJoining?.slice?.(0, 10) || ""}
                </td>
                <td className="border px-2 py-1">{e.biometricId || "-"}</td>
                <td className="border px-2 py-1">
                  {e.mappedUser
                    ? `${e.mappedUser.name} (${e.mappedUser.email || e.mappedUser.phone || ""})`
                    : "-"}
                </td>
                <td className="border px-2 py-1">{e.isActive ? "Yes" : "No"}</td>
                <td className="border px-2 py-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(e);
                        setEditOpen(true);
                      }}
                      className="text-indigo-600 text-xs underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(e.personal.employeeId)}
                      className="text-red-600 text-xs underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!displayed.length && (
              <tr>
                <td className="border px-2 py-4 text-center text-sm text-gray-500" colSpan={9}>
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
          initial={null}
        />
      )}
      {editOpen && editing && (
        <EmployeeModal
          onClose={() => {
            setEditOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setEditOpen(false);
            setEditing(null);
            refresh();
          }}
          initial={editing}
        />
      )}
    </div>
  );
}
