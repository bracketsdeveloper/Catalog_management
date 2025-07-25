import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
//import  logoImg from  '../../public/pacer-logo.jpeg';
import { CgOrganisation } from "react-icons/cg";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

import {
  UserIcon,
  UserGroupIcon,
  CubeIcon,
  BookOpenIcon,
  EyeIcon,
  ArrowLeftOnRectangleIcon,
  PencilIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon
} from "@heroicons/react/24/outline";

/* ------------------------------------------------------------------ */
/* TOP‑LEVEL NAVIGATION CONFIG                                        */
/* ------------------------------------------------------------------ */



const adminPages = [
  /* ----------------------- TASK MANAGER ------------------------------ */
  {
    name: "Dashboard",
    defaultPath: "/admin-dashboard/manage-tasks",
    icon: <PencilIcon className="w-8 h-8 flex justify-center items-center" />,
    subItems: [
      {
        name: "Manage Tasks",
        path: "/admin-dashboard/manage-tasks",
        permission: "manage-task",
      },
      {
        name: "Manage Tickets",
        path: "/admin-dashboard/manage-tickets"
      }
      
    ],
  },
  {
    name: "Sales",
    defaultPath: "/admin-dashboard/manage-dc",
    icon: <ReceiptPercentIcon className="w-8 h-8 flex justify-center items-center" />,
    subItems: [
      {
        name: "Manage DC",
        path: "/admin-dashboard/manage-dc",
        permission: "manage-dc",
      },
      
    ],
  },
  {
    name: "User Management",
    defaultPath: "/admin-dashboard/manage-users",
    icon: <UserIcon  className="w-8 h-8 flex justify-center items-center" />,
    subItems: [
      {
        name: "Manage Users",
        path: "/admin-dashboard/manage-users",
        permission: "manage-users",
      },
      {
        name: "Manage Permissions",
        path: "/admin-dashboard/subadmin-manager",
        permission: "sub-admins",
      },
    ],
  },
  {
    name: "Calculations",
    defaultPath: "/admin-dashboard/segment-manager",
    icon: <CubeIcon className="w-8 h-8 flex justify-center items-center" />,
    subItems: [
      {
        name: "Segment Manager",
        path: "/admin-dashboard/manage-segments",
        permission: "segment-manager",
      },
      {
        name: "Manage Brandings",
        path: "/admin-dashboard/manage-branding-charges",
        permission: "manage-branding-charges",
      },
    ],
  },









  
  // {
  //   name: "Review Catalog",
  //   path: "/admin-dashboard/review-catalog",
  //   permission: "review-catalog",
  //   icon: (
  //     <img src="/Review_catalog.png" className="h-12 w-12" alt="Review Catalog" />
  //   ),
  // },
  // {
  //   name: "Add Viewers",
  //   path: "/admin-dashboard/viewer-manager",
  //   permission: "viewers-manager",
  //   icon: (
  //     <img src="/Add_Viewers.png" className="h-12 w-12" alt="Viewers" />
  //   ),
  // },

  /* ----------------------- CRM ----------------------------------- */

  

  {
    name: "CRM",
    defaultPath: "/admin-dashboard/manage-companies",
    icon: (
      <img src='/CRM.png' alt="CRM Icon" className="h-12 w-12" />
    ),
    subItems: [
      {
        name: "Manage Client/Company Details",
        path: "/admin-dashboard/manage-companies",
        permission: "manage-companies",
      },
      {
        name: "Add / Manage Opportunity",
        path: "/admin-dashboard/opportunities",
        permission: "opportunities",
      },
      {
        name: "Add / Manage Products",
        path: "/admin-dashboard/manage-products",
        permission: "manage-products",
      },
      {
        name: "Add / Manage Catalog",
        path: "/admin-dashboard/manage-catalogs",
        permission: "manage-catalog",
      },
      {
        name: "Add / Manage Quotation",
        path: "/admin-dashboard/manage-quotations",
        permission: "manage-quotation",
      },
      {
        name: "Add / Manage Job Sheets",
        path: "/admin-dashboard/manage-jobsheets",
        permission: "manage-jobsheets",
      },
    ],
  },

  /* ----------------------- PURCHASE ------------------------------ */
  {
    name: "PURCHASE",
    defaultPath: "/admin-dashboard/manage-openpurchase",
    icon: (
      <img src='/Purchase.png' alt="Purchase Icon" className="h-12 w-12" />
    ),
    subItems: [
        {
        name: "Add / Manage Vendor",
        path: "/admin-dashboard/manage-vendors",
        permission: "manage-vendors",
      },
      {
        name: "Open Purchase",
        path: "/admin-dashboard/manage-openpurchase",
        permission: "open-purchase",
      },
      {
        name: "Closed Purchases",
        path: "/admin-dashboard/manage-closepurchase",
        permission: "closed-purchases",
      },
      {
        name: "Manage Purchase Invoice",
        path: "/admin-dashboard/manage-purchaseinvoice",
        permission: "manage-purchaseinvoice",
      },
    ],
  },

  /* ----------------------- PRODUCTION ---------------------------- */
  {
    name: "Production",
    defaultPath: "/admin-dashboard/manage-productionjobsheet",
    icon: (
      <img src='/Production.png' alt="Production Icon" className="h-12 w-12" />
    ),
    subItems: [
      {
        name: "Open Production",
        path: "/admin-dashboard/manage-productionjobsheet",
        permission: "manage-productionjobsheet",
      },
      {
        name: "Closed Production",
        path: "/admin-dashboard/closed-productionjobsheet",
        permission: "closed-productionjobsheet",
      },
      {
        name: "Production Invoice",
        path: "/admin-dashboard/manage-production-invoice",
        permission: "production-invoice",
      },
    ],
  },

  /* ------------------- NEW: PACKING / DELIVERY ------------------- */
  {
    name: "Packing / Delivery",
    defaultPath: "/admin-dashboard/pending-packing",
    icon:(
      <img src='/Packing.png' alt="Packing Icon" className="h-12 w-12" />
    ),
    /* 
      We keep every leaf page in subItems; a `group` key lets
      the menu renderer show the two mid‑level subsections.
    */
    subItems: [
      /* Packing & QC */
      {
        group: "Packing & QC",
        name: "Pending Packing",
        path: "/admin-dashboard/pending-packing",
        permission: "pending-packing",
      },
      {
        group: "Packing & QC",
        name: "Packing Completed",
        path: "/admin-dashboard/closed-pending-packing",
        permission: "closed-packing-completed",
      },

      /* Delivery */
      {
        group: "Delivery",
        name: "Dispatch Scheduled",
        path: "/admin-dashboard/dispatch-scheduled",
        permission: "dispatch-scheduled",
      },
      {
        group: "Delivery",
        name: "Delivery Reports",
        path: "/admin-dashboard/delivery-reports",
        permission: "delivery-reports",
      },
      {
        group: "Delivery",
        name: "Delivery Completed",
        path: "/admin-dashboard/delivery-completed",
        permission: "delivery-completed",
      },
    ],
  },

  /* ------------------- NEW: INVOICES FOLLOW UP & SUMMARY ------------------- */
  {
    name: "Invoices Follow up & Summary",
    defaultPath: "/admin-dashboard/invoice-followup",
    icon: (
      <img src='/Invoices.png' alt="Invoices Icon" className="h-12 w-12" />
    ),
    subItems: [
      {
        name: "PO Follow Up",
        path: "/admin-dashboard/invoice-followup",
        permission: "invoices-followup",
      },
      {
        name: "Invoices Summary",
        path: "/admin-dashboard/invoice-summary",
        permission: "invoices-summary",
      },
      {
        name: "Payment Follow Up",
        path: "/admin-dashboard/payment-followup",
        permission: "payment-followup",
      },
    ],
  },

  /* ----------------------- SAMPLES ------------------------------ */
  {
    name: "Samples",
    defaultPath: "/admin-dashboard/manage-samples",
    icon: (
      <img src="/Sample.png" className="h-8 w-8" alt="Samples" />
    ),
    subItems: [
      {
        name: "Manage Samples",
        path: "/admin-dashboard/manage-samples",
        permission: "manage-samples",
      },
      {
        name: "Samples-Out Report",
        path: "/admin-dashboard/samples-out",
        permission: "sample-out",
      },
      {
        name: "Sample Status",
        path: "/admin-dashboard/sample-status",
        permission: "sample-status",
      },
      
      
    ],
  },

  {
    name: "Expense Recording",
    defaultPath: "/admin-dashboard/manage-expenses",
    icon: (
      <img src="/expenses.png" className="h-8 w-8" alt="Samples" />
    ),
    subItems: [
      {
        name: "Manage Expenses",
        path: "/admin-dashboard/manage-expenses",
        permission: "manage-expenses",
      },
    ],
  },

  {
    name: "FollowUp Tracker",
    defaultPath: "/admin-dashboard/manage-potential-clients",
    icon: <BriefcaseIcon className="w-8 h-8 flex justify-center items-center" />,
    subItems: [
      {
        name: "Manage Potential Clients",
        path: "/admin-dashboard/manage-potential-clients",
        permission: "manage-potential-clients",
      },
      {
        name: "Manage Events",
        path: "/admin-dashboard/manage-events",
        permission: "manage-events",
      },
      { 
        name: "Events Calender",
        path: "/admin-dashboard/events-calender",
        permission: "events-calender",
      },
    ],
  },

  

];

/* ================================================================== */
/* COMPONENT                                                          */
/* ================================================================== */

export default function AdminDashboard() {
  /* ------------------------- SIDEBAR STATE ----------------------- */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);

  /* individual hover flags for mega‑menus */
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

  //user management
  const [userManagementHovered, setUserManagementHovered] = useState(false);
  

  

  /* ------------------------- AUTH STATE -------------------------- */
  const [permissions, setPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const isAdminDashboard = location.pathname === "/admin-dashboard" || location.pathname === "/admin-dashboard/";

  // Function to get time-based greeting
  const getTimeBasedGreeting = (username) => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return `Good Morning ${username}`;
    } else if (hour >= 12 && hour < 17) {
      return `Good Afternoon ${username}`;
    } else {
      return `Good Evening ${username}`;
    }
  };

  /* fetch role / permissions from localStorage once */
  useEffect(() => {
    const storedRole = localStorage.getItem("role") || "";
    setRole(storedRole);

    if (storedRole === "ADMIN") {
      let perms = [];
      try {
        perms = JSON.parse(localStorage.getItem("permissions") || "[]");
      } catch (err) {
        console.error(err);
      }
      setPermissions(perms);
      setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    }

    // Show greeting toast only when on the main admin dashboard page
    if (isAdminDashboard) {
      // Fetch current user's name and show greeting
      const fetchUserAndShowGreeting = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const username = response.data.name || "User";
          const greeting = getTimeBasedGreeting(username);
          
          toast.success(greeting, {
            position: "top-center",
            autoClose: 3000,
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to localStorage if API call fails
          const username = localStorage.getItem("name") || "User";
          const greeting = getTimeBasedGreeting(username);
          toast.success(greeting, {
            position: "top-center",
            autoClose: 3000,
          });
        }
      };

      fetchUserAndShowGreeting();
    }

    // Cleanup function (if needed)
    return () => {
      // Any cleanup logic here
    };
  }, [isAdminDashboard]); // Add isAdminDashboard as dependency

  /* ---------------------- SIGN‑OUT ------------------------------- */
  const handleSignOut = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ------------------- ACCESSIBLE PAGES FILTER ------------------- */
  const accessiblePages = adminPages.filter((page) => {
    if (page.name === "Calculations") {
      // For "Calculations", check if the user has the required permission
      const hasPermission = page.subItems.some(
        (sub) => permissions.includes(sub.permission)
      );
      return hasPermission;
    }

    // For other pages, use the existing logic
    if (page.subItems) {
      const accessibleSub = page.subItems.filter(
        (s) => isSuperAdmin || permissions.includes(s.permission)
      );
      return accessibleSub.length > 0;
    }
    return isSuperAdmin || permissions.includes(page.permission);
  });

  /* ---------------- SIDEBAR WIDTH LOGIC -------------------------- */
  const baseSidebarWidth = sidebarOpen || sidebarHover ? 224 : 100;
  const megaOpen =
    crmHovered || purchaseHovered || productionHovered || packDelHovered || invoicesHovered || samplesHovered || expenseHovered || followUpTrackerHovered || calculationsHovered || taskManagerHovered || SalesManagerHovered;
  const finalSidebarWidth = megaOpen ? baseSidebarWidth + 200 : baseSidebarWidth;

  /* ------------------------- RENDER ------------------------------ */
  /* role gate */
  if (role === "GENERAL") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
        <h1 className="text-4xl font-bold mb-4">DEACTIVE</h1>
        <p className="text-gray-500">You do not have admin privileges.</p>
        <button
          onClick={handleSignOut}
          className="mt-6 px-4 py-2 bg-red-500 text-white rounded-md"
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

  /* -------------------- SIDEBAR COMPONENT ------------------------ */
  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      {/* ============ LEFT SIDEBAR ============ */}
      <aside
        className="transition-all duration-300 overflow-y-auto overflow-x-hidden bg-[#Ff8045] text-white"
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
          }
        }}
      >
        {/* --- Brand / collapse button --- */}
      <div className="flex items-center justify-between pt-2">
      <h2 className="font-bold font-sans text-lg ">
        <img src="/pacer-logo.jpeg" alt="Logo"  className="h-8 w-20 ml-1" />  
      </h2>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)}>
              <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* ------------- NAVIGATION ------------- */}
        <nav className="mt-2 px-2">
          <ul className="space-y-2">
            {accessiblePages.map((page) => {
              /* ---------------- USER MANAGEMENT (mega‑menu) ---------------- */
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
              /* ---------------- CRM (mega‑menu) ---------------- */
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

              /* ------------- PURCHASE (mega‑menu) -------------- */
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

              /* ------------- PRODUCTION (mega‑menu) ------------- */
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

              /* ===== INVOICES FOLLOW UP & SUMMARY (mega‑menu) ==== */
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

              /* ===== SAMPLES (mega‑menu) ==== */
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

              /* ===== EXPENSE RECORDING (mega‑menu) ==== */
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

              /* ===== FOLLOW UP TRACKER (two‑tier menu) ==== */
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

              /* ===== CALCULATIONS (mega‑menu) ==== */
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

              /* ===== TASK MANAGER (mega‑menu) ==== */
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

              /* ===== PACKING / DELIVERY (two‑tier menu) ==== */
              if (page.name === "Packing / Delivery") {
                /* group leaf pages by `group` key */
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
                      className="flex items-center p-2 rounded-md hover:bg-white/10 transition whitespace-nowrap"
                    >
                      {page.icon}
                      {(sidebarOpen || sidebarHover) && (
                        <>
                          <span className="ml-3 text-sm font-medium">
                            {page.name}
                          </span>
                          <ChevronRightIcon className="h-4 w-4 ml-auto" />
                        </>
                      )}
                    </Link>

                    {/* nested container */}
                    <div
                      className={`ml-4 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                        packDelHovered
                          ? "max-h-96 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      {Object.entries(grouped).map(([groupName, items]) => (
                        <div key={groupName} className="mb-2">
                          <div className="text-xs font-semibold text-gray-200 mt-2 mb-1">
                            {groupName}
                          </div>
                          {items.map((sub) => (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              className="block p-2 rounded-md hover:bg-white/10 transition"
                            >
                              <span className="text-sm font-medium">
                                {sub.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </li>
                );
              }

              /* ---- simple single‑page link ---- */
              return (
                <li key={page.name}>
                  <Link
                    to={page.path}
                    className="flex items-center p-2 rounded-md hover:bg-white/10 transition whitespace-nowrap"
                  >
                    {page.icon}
                    {(sidebarOpen || sidebarHover) && (
                      <span className="ml-3 text-sm font-medium">
                        {page.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
  
        </nav>

        {/* ---------- FOOTER: LOGOUT ---------- */}
        <div className="mt-2 p-2">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full p-2 rounded-md hover:bg-white/10 transition"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            {(sidebarOpen || sidebarHover) && (
              <span className="ml-3 text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* ============ MAIN CONTENT ============ */}
      <main className="flex-1 overflow-y-auto p-1">
        {isAdminDashboard ? (
          <div className="flex items-center justify-center h-full">
          <img
            src='/pacer-loader.jpeg'
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

/* ****************************************************************** */
/* SMALL HELPER: GENERIC MEGA‑MENU (one‑tier)                          */
/* ****************************************************************** */
function MegaMenu({
  page,
  hovered,
  setHovered,
  sidebarOpen,
  sidebarHover,
}) {
  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        to={page.defaultPath}
        className="flex items-center p-2 rounded-md hover:bg-white/10 transition whitespace-nowrap"
      >
        {page.icon}
        {(sidebarOpen || sidebarHover) && (
          <>
            <span className="ml-3 text-sm font-medium">{page.name}</span>
            <ChevronRightIcon className="h-4 w-4 ml-auto" />
          </>
        )}
      </Link>

      {/* submenu */}
      <div
        className={`ml-4 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
          hovered ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {page.subItems.map((sub) => (
          <Link
            key={sub.name}
            to={sub.path}
            className="block p-2 rounded-md hover:bg-white/10 transition"
          >
            <span className="text-sm font-medium">{sub.name}</span>
          </Link>
        ))}
      </div>
    </li>
  );
}
    