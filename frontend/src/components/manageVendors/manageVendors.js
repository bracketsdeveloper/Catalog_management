import { useEffect, useState } from "react";
import { VendorAdd } from "./VendorAdd";
import axios from "axios";

export const ManageVendors = () => {
     const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

     const [vendors, setVendors] = useState([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);

     const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
    const [selectedVendor, setSelectedVendor] = useState(null);

    const openModal = () => {
        setModalMode("add");
        setSelectedVendor(null);
        setModalOpen(true);
    };  


     useEffect(() => {
        fetchVendors(); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setVendors(res.data);
            setError(null);
        } catch (err) {
            setError("Failed to fetch vendors");
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this vendor?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${BACKEND_URL}/api/admin/vendors/${id}?hard=true`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchVendors();
        } catch (_) {
            alert("Failed to delete");
        }
    };
    

    // const filteredVendors = vendors.filter((c) => {
    //     const s = searchTerm.toLowerCase();
    //     return (
    //         <>
    //         </>
    //     )
    // });
    return (
       <div className="p-6">
      {/* header */}
        <div className="flex justify-between items-center mb-4">
         <h1 className="text-2xl font-bold">Manage Vendors</h1>
           <div className="flex gap-2">
                <button onClick={openModal}  className="bg-orange-500 text-white px-4 py-2 rounded">
                Add Vendor
                </button>
           </div>
         </div>


         {/* add table */}
         <div>
            <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm font-semibold text-gray-700">
                <th className="p-3">Vendor Generic Name (what's app group)</th>
                <th className="p-3">Vendor company name (billing address)</th>
                <th className="p-3">Brand Dealing In</th>
                <th className="p-3">Location</th>
                <th className="p-3">Contact Person</th>
                <th className="p-3">GST#</th>
                <th className="p-3">Bank Name</th>
                <th className="p-3">Account Number</th>
                <th className="p-3">IFSC Code</th>
              </tr>
            </thead>
             <tbody>
                {vendors.map((c) => (
                    <tr key={c._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{c.vendorName}</td>
                      <td className="p-3">{c.vendorCompany}</td>
                      <td className="p-3">{c.brandDealing}</td>
                      <td className="p-3">{c.location}</td>
                      <td className="p-3">
                 {c.clients?.length ? (
                      <ul>
                        {c.clients.map((cl, i) => (
                          <li key={i} className="text-xs">
                            {cl.name} | {cl.contactNumber}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                      </td>
                      <td className="p-3">{c.gst}</td>
                      <td className="p-3">{c.bankName}</td>
                      <td className="p-3">{c.accountNumber}</td>
                      <td className="p-3">{c.ifscCode}</td>
                      <td className="p-3 space-x-1">
                        <button
                        //   onClick={() => openEditModal(c)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                ))} 
              </tbody>
    
        
            {/* <tbody>
              {filteredCompanies.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{c.companyName}</td>
                  <td className="p-3">{c.brandName || "-"}</td>
                  <td className="p-3">{c.GSTIN || "-"}</td>
                  <td className="p-3">
                    {c.clients?.length ? (
                      <ul>
                        {c.clients.map((cl, i) => (
                          <li key={i} className="text-xs">
                            {cl.name} | {cl.department || "-"} | {cl.email || "-"} | {cl.contactNumber}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">{c.companyAddress || "-"}</td>
                  <td className="p-3 space-x-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody> */}
          </table>
        </div>

            {modalOpen && (
                <VendorAdd
                  mode={modalMode}
                  vendor={selectedVendor}
                  onClose={() => setModalOpen(false)}
                  onSuccess={() => {
                    setModalOpen(false);
                    
                  }}
                  BACKEND_URL={BACKEND_URL}
                />
              )}
         </div>
       </div>
    )
}


