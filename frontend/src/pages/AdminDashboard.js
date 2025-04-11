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
} from "@heroicons/react/24/outline";

// Top-level navigation items. The "CRM" item includes subItems.
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
  {
    name: "CRM",
    defaultPath: "/admin-dashboard/manage-companies",
    icon: <CubeIcon className="h-6 w-6" />,
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
  {
    name: "PURCHASE",
    defaultPath: "/admin-dashboard/",
    icon: <CubeIcon className="h-6 w-6" />,
    subItems: [
      {
        name: "open-purchase",
        path: "/admin-dashboard/manage-openpurchase",
        permission: "open-purchase",
      },
      {
        name: "closed-purchases",
        path: "/admin-dashboard/manage-closepurchase",
        permission: "closed-purchases",
      },
      {
        name: "Manage Purchase Invoice",
        path: "/admin-dashboard/manage-purchaseinvoice",
        permission: "manage-purchaseinvoice",
      },
    ],
  },{
    name: "Production",
    defaultPath: "/admin-dashboard/",
    icon: <CubeIcon className="h-6 w-6" />,
    subItems: [
      {
        name: "Open Production Jobsheets",
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
        path: "/admin-dashboard/production-invoice",
        permission: "production-invoice",
      },
      
    ],
  },
];



export default function AdminDashboard() {
  // Local sidebar states.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [crmHovered, setCrmHovered] = useState(false);
  const [purchaseHovered, setPurchaseHovered] = useState(false);
  const [productionHovered, setProductionHovered] = useState(false);

  // Permissions and role.
  const [permissions, setPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedRole = localStorage.getItem("role") || "";
    setRole(storedRole);
    if (storedRole === "ADMIN") {
      let perms = [];
      const permsStr = localStorage.getItem("permissions");
      if (permsStr) {
        try {
          perms = JSON.parse(permsStr);
        } catch (err) {
          console.error(err);
        }
      }
      const superFlag = localStorage.getItem("isSuperAdmin") === "true";
      setPermissions(perms || []);
      setIsSuperAdmin(superFlag);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/login");
  };

  const displayedRole = role === "GENERAL" ? "DEACTIVE" : role;
  if (role === "GENERAL") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
        <h1 className="text-4xl font-bold mb-4">{displayedRole}</h1>
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

  // Filter accessible pages based on permissions.
  const accessiblePages = adminPages.filter((page) => {
    if (page.subItems) {
      const accessibleSub = page.subItems.filter(
        (sub) => isSuperAdmin || permissions.includes(sub.permission)
      );
      return accessibleSub.length > 0;
    }
    return isSuperAdmin || permissions.includes(page.permission);
  });

  // Determine base sidebar width from open/hover state.
  const baseSidebarWidth = (sidebarOpen || sidebarHover) ? 224 : 80;
  // When any menu with subItems is hovered, add extra 200px.
  const finalSidebarWidth = (crmHovered || purchaseHovered || productionHovered) ? baseSidebarWidth + 200 : baseSidebarWidth;

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      {/* Left Sidebar with smooth width transition */}
      <aside
        className="transition-all duration-300 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-purple-500 via-pink-500 to-blue-500 text-white"
        style={{ width: finalSidebarWidth }}
        onMouseEnter={() => { if (!sidebarOpen) setSidebarHover(true); }}
        onMouseLeave={() => {
          if (!sidebarOpen) {
            setSidebarHover(false);
            setCrmHovered(false);
            setPurchaseHovered(false);
            setProductionHovered(false);
          }
        }}
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="font-bold text-lg">Admin</h2>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)}>
              <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        <nav className="mt-4 px-2">
          <ul className="space-y-2">
            {accessiblePages.map((page) => {
              if (page.name === "CRM") {
                return (
                  <li
                    key={page.name}
                    onMouseEnter={() => setCrmHovered(true)}
                    onMouseLeave={() => setCrmHovered(false)}
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
                    {/* Always render the submenu container and transition its opacity and max height */}
                    <div
                      className={`ml-4 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                        crmHovered ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
              if (page.name === "PURCHASE") {
                return (
                  <li
                    key={page.name}
                    onMouseEnter={() => setPurchaseHovered(true)}
                    onMouseLeave={() => setPurchaseHovered(false)}
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
                    <div
                      className={`ml-4 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                        purchaseHovered ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
              if (page.name === "Production") {
                return (
                  <li
                    key={page.name}
                    onMouseEnter={() => setProductionHovered(true)}
                    onMouseLeave={() => setProductionHovered(false)}
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
                    <div
                      className={`ml-4 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                        productionHovered ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
