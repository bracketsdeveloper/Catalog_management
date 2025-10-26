// src/pages/hrms/EmployeeDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { HRMS } from "../api/hrmsClient";

export default function EmployeeDetailPage() {
  const { employeeId } = useParams();
  const [emp, setEmp] = useState(null);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  useEffect(() => {
    HRMS.getEmployee(employeeId).then(r => setEmp(r.data)).catch(()=>setEmp(null));
  }, [employeeId]);

  if (!emp) return <div className="p-6">Loading…</div>;

  const { personal, org, assets, financial } = emp;

  return (
    <div className="p-6">
      <PageHeader title={`Employee: ${personal.name}`} />
      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">Personal Information</h3>
          <InfoRow k="Employee ID" v={personal.employeeId} />
          <InfoRow k="DOB" v={personal.dob?.slice?.(0,10)} />
          <InfoRow k="Address" v={personal.address} />
          <InfoRow k="Phone" v={personal.phone} />
          <InfoRow k="Emergency Phone" v={personal.emergencyPhone} />
          <InfoRow k="Aadhar" v={personal.aadhar} />
          <InfoRow k="Blood Group" v={personal.bloodGroup} />
          <InfoRow k="Date of Joining" v={personal.dateOfJoining?.slice?.(0,10)} />
          <InfoRow k="Medical Issues" v={personal.medicalIssues} />
        </section>

        <section className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">Organisational Information</h3>
          <InfoRow k="Role" v={org?.role} />
          <InfoRow k="Department" v={org?.department} />
        </section>

        <section className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">Assets Information</h3>
          <InfoRow k="Laptop Serial" v={assets?.laptopSerial} />
          <InfoRow k="Mobile IMEI" v={assets?.mobileImei} />
          <InfoRow k="Mobile Number" v={assets?.mobileNumber} />
          <InfoRow k="ID Cards Issued" v={assets?.idCardsIssued ? "Yes" : "No"} />
          {(assets?.additionalProducts || []).length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Additional Products</div>
              <ul className="list-disc ml-5 text-sm">
                {assets.additionalProducts.map((p,i)=>(
                  <li key={i}>{p.name} — {p.serialOrDesc} ({p.issuedOn?.slice?.(0,10)})</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {isSuperAdmin && (
          <section className="rounded border p-4 bg-white">
            <h3 className="font-semibold mb-3">Financial Information</h3>
            <InfoRow k="Bank" v={financial?.bankName} />
            <InfoRow k="Account Number" v={financial?.bankAccountNumber} />
            <InfoRow k="Current CTC" v={financial?.currentCTC} />
            <InfoRow k="Take Home" v={financial?.currentTakeHome} />
            <InfoRow k="Last Revised" v={financial?.lastRevisedSalaryAt?.slice?.(0,10)} />
            <InfoRow k="Next Appraisal" v={financial?.nextAppraisalOn?.slice?.(0,10)} />
          </section>
        )}
      </div>
    </div>
  );
}

function InfoRow({ k, v }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b last:border-0">
      <div className="text-gray-500">{k}</div>
      <div className="text-gray-800">{v || "-"}</div>
    </div>
  );
}
