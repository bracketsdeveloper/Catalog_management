"use client";

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

// Define top-level navigation items.
// The CRM item has a defaultPath and an array of subItems.
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
];

export default function AdminDashboard() {
  // Sidebar open/hover state controls the left part's (base) width.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  // crmHovered controls whether the CRM submenu is visible.
  const [crmHovered, setCrmHovered] = useState(false);
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

  // Filter pages based on the permissions. For items with subItems (e.g. CRM),
  // ensure that at least one sub-item is accessible.
  const accessiblePages = adminPages.filter((page) => {
    if (page.subItems) {
      const accessibleSub = page.subItems.filter(
        (sub) => isSuperAdmin || permissions.includes(sub.permission)
      );
      return accessibleSub.length > 0;
    }
    return isSuperAdmin || permissions.includes(page.permission);
  });

  // Base left sidebar width. When in “open”/hover mode it’s 224px; otherwise 80px.
  const leftSidebarWidth = sidebarOpen || sidebarHover ? 380 : 80;

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      {/* Left Sidebar */}
      {/* The aside is fixed-width (leftSidebarWidth) but it supports horizontal scrolling */}
      <aside
        className="transition-all duration-300 overflow-y-auto overflow-x-auto bg-gradient-to-b from-purple-500 via-pink-500 to-blue-500 text-white"
        style={{ width: leftSidebarWidth }}
        onMouseEnter={() => !sidebarOpen && setSidebarHover(true)}
        onMouseLeave={() => {
          !sidebarOpen && setSidebarHover(false);
          setCrmHovered(false);
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
          {/* Wrap the list in a div whose width can exceed the aside width */}
          <ul className="flex flex-col space-y-2 min-w-full">
            {accessiblePages.map((page) => {
              if (page.name === "CRM") {
                return (
                  <li
                    key={page.name}
                    onMouseEnter={() => setCrmHovered(true)}
                    onMouseLeave={() => setCrmHovered(false)}
                  >
                    <div className="flex">
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
                      {crmHovered && (
                        <div className="flex flex-col border-l border-white ml-2 whitespace-nowrap">
                          {page.subItems.map((sub) => (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              className="flex items-center p-2 rounded-md hover:bg-white/10 transition"
                            >
                              <span className="text-sm font-medium">
                                {sub.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
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
