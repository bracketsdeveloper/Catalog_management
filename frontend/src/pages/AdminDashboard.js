import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { CgOrganisation } from "react-icons/cg";
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
} from "@heroicons/react/24/outline";

/* ------------------------------------------------------------------ */
/* TOP‑LEVEL NAVIGATION CONFIG                                        */
/* ------------------------------------------------------------------ */

const adminPages = [
  {
    name: "Users",
    path: "/admin-dashboard/manage-users",
    permission: "manage-users",
    icon: <UserIcon className="h-6 w-6" />,
  },
  {
    name: "Manage Sub-Admins",
    path: "/admin-dashboard/subadmin-manager",
    permission: "sub-admins",
    icon: <UserGroupIcon className="h-6 w-6" />,
  },
  {
    name: "Review Catalog",
    path: "/admin-dashboard/review-catalog",
    permission: "review-catalog",
    icon: <PencilIcon className="h-6 w-6" />,
  },
  {
    name: "Add Viewers",
    path: "/admin-dashboard/viewer-manager",
    permission: "viewers-manager",
    icon: <EyeIcon className="h-6 w-6" />,
  },

  /* ----------------------- CRM ----------------------------------- */
  {
    name: "CRM",
    defaultPath: "/admin-dashboard/manage-companies",
    icon: <UserGroupIcon className="h-6 w-6" />,
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
        path: "/admin-dashboard/manage-catalogs",
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
    defaultPath: "/admin-dashboard/",
    icon: <ShoppingBagIcon className="h-6 w-6" />,
    subItems: [
      {
        name: "Manage Purchase",
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
    defaultPath: "/admin-dashboard/",
    icon: <CurrencyDollarIcon className="h-6 w-6" />,
    subItems: [
      {
        name: "Manage Production Jobsheets",
        path: "/admin-dashboard/manage-productionjobsheet",
        permission: "manage-productionjobsheet",
      },
      {
        name: "Closed Production Jobsheets",
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
    defaultPath: "/admin-dashboard/packing-pending",
    icon: <CubeIcon className="h-6 w-6" />,
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

  /* ------------------------- AUTH STATE -------------------------- */
  const [permissions, setPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

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
  }, []);

  /* ---------------------- SIGN‑OUT ------------------------------- */
  const handleSignOut = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ------------------- ACCESSIBLE PAGES FILTER ------------------- */
  const accessiblePages = adminPages.filter((page) => {
    if (page.subItems) {
      const accessibleSub = page.subItems.filter(
        (s) => isSuperAdmin || permissions.includes(s.permission)
      );
      return accessibleSub.length > 0;
    }
    return isSuperAdmin || permissions.includes(page.permission);
  });

  /* ---------------- SIDEBAR WIDTH LOGIC -------------------------- */
  const baseSidebarWidth = sidebarOpen || sidebarHover ? 224 : 80;
  const megaOpen =
    crmHovered || purchaseHovered || productionHovered || packDelHovered;
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
        className="transition-all duration-300 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-purple-500 via-pink-500 to-blue-500 text-white"
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
          }
        }}
      >
        {/* --- Brand / collapse button --- */}
        <div className="flex items-center justify-between p-4">
          <h2 className="font-bold text-lg">Admin</h2>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)}>
              <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* ------------- NAVIGATION ------------- */}
        <nav className="mt-4 px-2">
          <ul className="space-y-2">
            {accessiblePages.map((page) => {
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

              /* ===== NEW: PACKING / DELIVERY (two‑tier menu) ==== */
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
        <div className="mt-auto p-4">
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
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
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
}: {
  page: any;
  hovered: boolean;
  setHovered: (v: boolean) => void;
  sidebarOpen: boolean;
  sidebarHover: boolean;
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
  