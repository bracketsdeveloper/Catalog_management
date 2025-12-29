import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

import {
  UserIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowLeftOnRectangleIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  ReceiptPercentIcon,
  UserCircleIcon,
  PencilIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

/* ------------------------------------------------------------------ */
/* TOP-LEVEL NAVIGATION CONFIG                                        */
/* ------------------------------------------------------------------ */

const adminPages = [
  {
    name: "Dashboard",
    defaultPath: "/admin-dashboard/manage-tasks",
    icon: <PencilIcon className="w-8 h-8 shrink-0" />,
    subItems: [
      { name: "Manage Tasks", path: "/admin-dashboard/manage-tasks", permission: "manage-task" },
      { name: "Manage Tickets", path: "/admin-dashboard/manage-tickets" },
      { name:"Manuals",path:"/admin-dashboard/file-management"  }
    ],
  },
  {
    name: "Sales",
    defaultPath: "/admin-dashboard/manage-dc",
    icon: <ReceiptPercentIcon className="w-8 h-8 shrink-0" />,
    subItems: [
      { name: "Manage Invoices", path: "/admin-dashboard/manage-invoices", permission: "manage-einvoice" },
      { name: "Manage DC", path: "/admin-dashboard/manage-dc", permission: "manage-dc" },
      { name: "Manage E-Invoice", path: "/admin-dashboard/e-invoice", permission: "manage-einvoice" },
    ],
  },
  {
    name: "Accounts",
    defaultPath: "/admin-dashboard/bank-statement",
    icon: <BanknotesIcon className="w-8 h-8 shrink-0" />,
    subItems: [
      { name: "Bank Statements", path: "/admin-dashboard/bank-statement", permission: "bank-statements" },
      { name: "Suspense Account", path: "/admin-dashboard/suspense", permission: "suspense" }
    ],
  },
  {
    name: "User Management",
    defaultPath: "/admin-dashboard/manage-users",
    icon: <UserIcon className="w-8 h-8 shrink-0" />,
    subItems: [
      { name: "Manage Users", path: "/admin-dashboard/manage-users", permission: "manage-users" },
      { name: "Manage Permissions", path: "/admin-dashboard/subadmin-manager", permission: "sub-admins" },
    ],
  },
  {
    name: "Calculations",
    defaultPath: "/admin-dashboard/segment-manager",
    icon: <CubeIcon className="w-8 h-8 shrink-0" />,
    subItems: [
      { name: "Segment Manager", path: "/admin-dashboard/manage-segments", permission: "segment-manager" },
      { name: "Manage Brandings", path: "/admin-dashboard/manage-branding-charges", permission: "manage-branding-charges" },
    ],
  },
  {
    name: "CRM",
    defaultPath: "/admin-dashboard/manage-companies",
    icon: <img src="/CRM.png" alt="CRM Icon" className="h-9 w-9 shrink-0" />,
    subItems: [
      { name: "Manage Client/Company Details", path: "/admin-dashboard/manage-companies", permission: "manage-companies" },
      { name: "Add / Manage Opportunity", path: "/admin-dashboard/opportunities", permission: "opportunities" },
      { name: "Add / Manage Products", path: "/admin-dashboard/manage-products", permission: "manage-products" },
      { name: "Add / Manage Catalog", path: "/admin-dashboard/manage-catalogs", permission: "manage-catalog" },
      { name: "Add / Manage Quotation", path: "/admin-dashboard/manage-quotations", permission: "manage-quotation" },
      { name: "Add / Manage Job Sheets", path: "/admin-dashboard/manage-jobsheets", permission: "manage-jobsheets" },
    ],
  },
  {
    name: "PURCHASE",
    defaultPath: "/admin-dashboard/manage-openpurchase",
    icon: <img src="/Purchase.png" alt="Purchase Icon" className="h-9 w-9 shrink-0" />,
    subItems: [
      { name: "Add / Manage Vendor", path: "/admin-dashboard/manage-vendors", permission: "manage-vendors" },
      { name: "Purchase Orders", path: "/admin-dashboard/purchase-orders", permission: "open-purchase" },
      { name: "Open Purchase", path: "/admin-dashboard/manage-openpurchase", permission: "open-purchase" },
      { name: "Closed Purchases", path: "/admin-dashboard/manage-closepurchase", permission: "closed-purchases" },
      { name: "Manage Purchase Invoice", path: "/admin-dashboard/manage-purchaseinvoice", permission: "manage-purchaseinvoice" },
    ],
  },
  {
    name: "Production",
    defaultPath: "/admin-dashboard/manage-productionjobsheet",
    icon: <img src="/Production.png" alt="Production Icon" className="h-9 w-9 shrink-0" />,
    subItems: [
      { name: "Open Production", path: "/admin-dashboard/manage-productionjobsheet", permission: "manage-productionjobsheet" },
      { name: "Closed Production", path: "/admin-dashboard/closed-productionjobsheet", permission: "closed-productionjobsheet" },
      { name: "Production Invoice", path: "/admin-dashboard/manage-production-invoice", permission: "production-invoice" },
    ],
  },
  {
    name: "Packing / Delivery",
    defaultPath: "/admin-dashboard/pending-packing",
    icon: <img src="/Packing.png" alt="Packing Icon" className="h-9 w-9 shrink-0" />,
    subItems: [
      { group: "Packing & QC", name: "Pending Packing", path: "/admin-dashboard/pending-packing", permission: "pending-packing" },
      { group: "Packing & QC", name: "Packing Completed", path: "/admin-dashboard/closed-pending-packing", permission: "closed-packing-completed" },
      { group: "Delivery", name: "Dispatch Scheduled", path: "/admin-dashboard/dispatch-scheduled", permission: "dispatch-scheduled" },
      { group: "Delivery", name: "Delivery Reports", path: "/admin-dashboard/delivery-reports", permission: "delivery-reports" },
      { group: "Delivery", name: "Delivery Completed", path: "/admin-dashboard/delivery-completed", permission: "delivery-completed" },
    ],
  },
  {
    name: "Invoices Follow up & Summary",
    defaultPath: "/admin-dashboard/invoice-followup",
    icon: <img src="/Invoices.png" alt="Invoices Icon" className="h-9 w-9 shrink-0" />,
    subItems: [
      { name: "PO Follow Up", path: "/admin-dashboard/invoice-followup", permission: "invoices-followup" },
      { name: "Invoices Summary", path: "/admin-dashboard/invoice-summary", permission: "invoices-summary" },
      { name: "Payment Follow Up", path: "/admin-dashboard/payment-followup", permission: "payment-followup" },
    ],
  },
  {
    name: "Samples",
    defaultPath: "/admin-dashboard/manage-samples",
    icon: <img src="/Sample.png" className="h-8 w-8 shrink-0" alt="Samples" />,
    subItems: [
      { name: "Manage Samples", path: "/admin-dashboard/manage-samples", permission: "manage-samples" },
      { name: "Samples-Out Report", path: "/admin-dashboard/samples-out", permission: "sample-out" },
      { name: "Sample Status", path: "/admin-dashboard/sample-status", permission: "sample-status" },
    ],
  },
  {
    name: "Expense Recording",
    defaultPath: "/admin-dashboard/manage-expenses",
    icon: <img src="/expenses.png" className="h-8 w-8 shrink-0" alt="Expenses" />,
    subItems: [
      { name: "Manage Expenses", path: "/admin-dashboard/manage-expenses", permission: "manage-expenses" },
    ],
  },
  {
    name: "FollowUp Tracker",
    defaultPath: "/admin-dashboard/manage-potential-clients",
    icon: <BriefcaseIcon className="w-8 h-8 shrink-0" />,
    subItems: [
      { name: "Manage Potential Clients", path: "/admin-dashboard/manage-potential-clients", permission: "manage-potential-clients" },
      { name: "Manage Events", path: "/admin-dashboard/manage-events", permission: "manage-events" },
      { name: "Events Calender", path: "/admin-dashboard/events-calender", permission: "events-calender" },
    ],
  },
  {
    name: "HRMS",
    defaultPath: "/admin-dashboard/hrms/employees",
    icon: <UserGroupIcon className="w-8 h-8 shrink-0" />,
    subItems: [
      { name: "Employees", path: "/admin-dashboard/hrms/employees", permission: "hrms-employees" },
      { name: "Salary", path: "/admin-dashboard/salary", permission: "hrms-employees" },
      { name: "Holidays", path: "/admin-dashboard/holidays", permission: "holidays" },
      { name: "Leave Tracker", path: "/admin-dashboard/leaves-super-admin", permission: "leaves" },
      { name: "Upload Attendance", path: "/admin-dashboard/hrms/attendance", permission: "hrms-attendance" },
      { name: "Attendance Summary", path: "/admin-dashboard/attendance-summary", permission: "hrms-attendance-summary" },
      { name: "Leaves", path: "/admin-dashboard/hrms/leaves", permission: "hrms-leaves" },
    ],
  },
];

/* ================================================================== */
/* COMPONENT                                                          */
/* ================================================================== */

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);

  const [crmHovered, setCrmHovered] = useState(false);
  const [purchaseHovered, setPurchaseHovered] = useState(false);
  const [productionHovered, setProductionHovered] = useState(false);
  const [packDelHovered, setPackDelHovered] = useState(false);
  const [invoicesHovered, setInvoicesHovered] = useState(false);
  const [samplesHovered, setSamplesHovered] = useState(false);
  const [expenseHovered, setExpenseHovered] = useState(false);
  const [followUpTrackerHovered, setFollowUpTrackerHovered] = useState(false);
  const [calculationsHovered, setCalculationsHovered] = useState(false);
  const [taskManagerHovered, setTaskManagerHovered] = useState(false);
  const [SalesManagerHovered, setSalesManagerHovered] = useState(false);
  const [userManagementHovered, setUserManagementHovered] = useState(false);
  const [accountsHovered, setAccountsHovered] = useState(false);
  const [hrmsHovered, setHrmsHovered] = useState(false);

  const [permissions, setPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const isAdminDashboard =
    location.pathname === "/admin-dashboard" || location.pathname === "/admin-dashboard/";

  const getTimeBasedGreeting = (username) => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return `Good Morning ${username}`;
    if (hour >= 12 && hour < 17) return `Good Afternoon ${username}`;
    return `Good Evening ${username}`;
  };

  useEffect(() => {
    const storedRole = localStorage.getItem("role") || "";
    setRole(storedRole);

    if (storedRole === "ADMIN") {
      let perms = [];
      try {
        perms = JSON.parse(localStorage.getItem("permissions") || "[]");
      } catch {}
      setPermissions(perms);
      setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    }

    if (isAdminDashboard) {
      const fetchUserAndShowGreeting = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}/api/admin/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const username = response.data.name || "User";
          toast.success(getTimeBasedGreeting(username), {
            position: "top-center",
            autoClose: 3000,
          });
        } catch {
          const username = localStorage.getItem("name") || "User";
          toast.success(getTimeBasedGreeting(username), {
            position: "top-center",
            autoClose: 3000,
          });
        }
      };
      fetchUserAndShowGreeting();
    }
  }, [isAdminDashboard]);

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ---------------- FILTER PAGES + SUBITEMS BY PERMISSIONS ---------------- */

  const accessiblePages = adminPages
    .map((page) => {
      if (page.subItems && Array.isArray(page.subItems)) {
        const filteredSubItems = page.subItems.filter((sub) => {
          if (isSuperAdmin) return true;
          if (!sub.permission) return true;
          return permissions.includes(sub.permission);
        });

        return { ...page, subItems: filteredSubItems };
      }

      if (!page.permission) {
        return isSuperAdmin ? page : null;
      }
      if (isSuperAdmin || permissions.includes(page.permission)) {
        return page;
      }
      return null;
    })
    .filter((p) => {
      if (!p) return false;
      if (p.subItems && p.subItems.length === 0) return false;
      return true;
    });

  const baseSidebarWidth = sidebarOpen || sidebarHover ? 220 : 92;
  const megaOpen =
    crmHovered ||
    purchaseHovered ||
    productionHovered ||
    packDelHovered ||
    invoicesHovered ||
    samplesHovered ||
    expenseHovered ||
    followUpTrackerHovered ||
    calculationsHovered ||
    taskManagerHovered ||
    SalesManagerHovered ||
    userManagementHovered ||
    accountsHovered ||
    hrmsHovered;
  const finalSidebarWidth = megaOpen ? baseSidebarWidth + 180 : baseSidebarWidth;

  if (role === "GENERAL") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
        <h1 className="text-3xl font-semibold mb-2">DEACTIVE</h1>
        <p className="text-gray-500 text-sm">You do not have admin privileges.</p>
        <button
          onClick={handleSignOut}
          className="mt-5 px-3 py-1.5 bg-red-500 text-white rounded"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (role !== "ADMIN") {
    navigate("/unauthorized");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      <Link
        to="/admin-dashboard/my-profile"
        aria-label="My Profile"
        className="fixed top-3 right-3 z-50 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow hover:bg-white active:scale-[0.98] transition"
        title="My Profile"
      >
        <UserCircleIcon className="h-7 w-7 text-gray-700" />
      </Link>

      <aside
        className="transition-all duration-300 overflow-y-auto overflow-x-hidden bg-[#Ff8045] text-white leading-tight"
        style={{ width: finalSidebarWidth }}
        onMouseEnter={() => {
          if (!sidebarOpen) setSidebarHover(true);
        }}
        onMouseLeave={() => {
          if (!sidebarOpen) {
            setSidebarHover(false);
            setCrmHovered(false);
            setPurchaseHovered(false);
            setProductionHovered(false);
            setPackDelHovered(false);
            setExpenseHovered(false);
            setCalculationsHovered(false);
            setInvoicesHovered(false);
            setSamplesHovered(false);
            setFollowUpTrackerHovered(false);
            setUserManagementHovered(false);
            setAccountsHovered(false);
            setSalesManagerHovered(false);
            setTaskManagerHovered(false);
            setHrmsHovered(false);
          }
        }}
      >
        <div className="flex items-center justify-between px-3 py-3">
          <img src="/pacer-logo.jpeg" alt="Logo" className="h-9 w-24" />
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded hover:bg-white/10"
            >
              <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        <nav className="px-2">
          <ul className="space-y-2">
            {accessiblePages.map((page) => {
              if (page.name === "User Management") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={userManagementHovered}
                    setHovered={setUserManagementHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Accounts") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={accountsHovered}
                    setHovered={setAccountsHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "CRM") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={crmHovered}
                    setHovered={setCrmHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "PURCHASE") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={purchaseHovered}
                    setHovered={setPurchaseHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Production") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={productionHovered}
                    setHovered={setProductionHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Invoices Follow up & Summary") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={invoicesHovered}
                    setHovered={setInvoicesHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Samples") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={samplesHovered}
                    setHovered={setSamplesHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Expense Recording") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={expenseHovered}
                    setHovered={setExpenseHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "FollowUp Tracker") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={followUpTrackerHovered}
                    setHovered={setFollowUpTrackerHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Calculations") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={calculationsHovered}
                    setHovered={setCalculationsHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Dashboard") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={taskManagerHovered}
                    setHovered={setTaskManagerHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "Sales") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={SalesManagerHovered}
                    setHovered={setSalesManagerHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }
              if (page.name === "HRMS") {
                return (
                  <MegaMenu
                    key={page.name}
                    page={page}
                    hovered={hrmsHovered}
                    setHovered={setHrmsHovered}
                    sidebarOpen={sidebarOpen}
                    sidebarHover={sidebarHover}
                  />
                );
              }

              if (page.name === "Packing / Delivery") {
                const grouped = page.subItems.reduce((acc, item) => {
                  acc[item.group] = acc[item.group] || [];
                  acc[item.group].push(item);
                  return acc;
                }, {});
                return (
                  <li
                    key={page.name}
                    onMouseEnter={() => setPackDelHovered(true)}
                    onMouseLeave={() => setPackDelHovered(false)}
                  >
                    <Link
                      to={page.defaultPath}
                      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 transition whitespace-nowrap text-sm"
                    >
                      {page.icon}
                      {(sidebarOpen || sidebarHover) && (
                        <>
                          <span className="truncate">{page.name}</span>
                          <ChevronRightIcon className="h-5 w-5 ml-auto" />
                        </>
                      )}
                    </Link>

                    <div
                      className={`ml-3 transition-all duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                        packDelHovered ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      {Object.entries(grouped).map(([groupName, items]) => (
                        <div key={groupName} className="mb-2">
                          <div className="text-[11px] font-semibold text-gray-200 mt-1 mb-1 uppercase tracking-wide">
                            {groupName}
                          </div>
                          <div className="grid gap-1.5">
                            {items.map((sub) => (
                              <Link
                                key={sub.name}
                                to={sub.path}
                                className="block px-3 py-1.5 rounded hover:bg-white/10 transition text-sm"
                              >
                                <span className="truncate">{sub.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              }

              return (
                <li key={page.name}>
                  <Link
                    to={page.defaultPath}
                    className="flex items-center gap-3 px-3 py-2 rounded hover:bg.white/10 transition whitespace-nowrap text-sm"
                  >
                    {page.icon}
                    {(sidebarOpen || sidebarHover) && (
                      <span className="truncate">{page.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-2 p-2">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full gap-3 px-3 py-2 rounded hover:bg-white/10 transition text-sm"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            {(sidebarOpen || sidebarHover) && <span className="truncate">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-2">
        {isAdminDashboard ? (
          <div className="flex items-center justify-center h-full">
            <img
              src="/pacer-loader.jpeg"
              alt="Admin Dashboard Background"
              className="w-full h-full"
            />
          </div>
        ) : (
          <Outlet key={location.pathname} />
        )}
      </main>
    </div>
  );
}

function MegaMenu({ page, hovered, setHovered, sidebarOpen, sidebarHover }) {
  if (!page.subItems || page.subItems.length === 0) {
    return null;
  }

  return (
    <li onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Link
        to={page.defaultPath}
        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 transition whitespace-nowrap text-sm"
      >
        {page.icon}
        {(sidebarOpen || sidebarHover) && (
          <>
            <span className="truncate">{page.name}</span>
            <ChevronRightIcon className="h-5 w-5 ml-auto" />
          </>
        )}
      </Link>

      <div
        className={`ml-3 transition-all duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
          hovered ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="grid gap-1.5">
          {page.subItems.map((sub) => (
            <Link
              key={sub.name}
              to={sub.path}
              className="block px-3 py-1.5 rounded hover:bg-white/10 transition text-sm"
            >
              <span className="truncate">{sub.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </li>
  );
}