"use client";

import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { CgOrganisation } from "react-icons/cg";
import {
  UserIcon,
  UserGroupIcon,
  CubeIcon,
  BookOpenIcon,
  EyeIcon,
  ArrowLeftOnRectangleIcon,
  PencilIcon,
  BriefcaseIcon
} from "@heroicons/react/24/outline";

const adminPages = [
  {
    name: "Users",
    path: "/admin-dashboard/manage-users",
    permission: "manage-users",
    icon: <UserIcon className="h-6 w-6" />,
  },
  {
    name: "Manage Companies",
    path: "/admin-dashboard/manage-companies",
    permission: "manage-companies",
    icon: <CgOrganisation className="h-6 w-6" />,
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
    name: "Manage Products",
    path: "/admin-dashboard/manage-products",
    permission: "manage-products",
    icon: <CubeIcon className="h-6 w-6" />,
  },
  {
    name: "Manage Opportunities",
    path: "/admin-dashboard/opportunities",
    permission: "opportunities",
    icon: <BookOpenIcon className="h-6 w-6" />,
  },
  {
    name: "Manage Catalogs",
    path: "/admin-dashboard/manage-catalogs",
    permission: "manage-catalog",
    icon: <BookOpenIcon className="h-6 w-6" />,
  },
  {
    name: "Add Viewers",
    path: "/admin-dashboard/viewer-manager",
    permission: "viewers-manager",
    icon: <EyeIcon className="h-6 w-6" />,
  },
  {
    name:"Manage Jobsheets",
    path:"/admin-dashboard/manage-jobsheets",
    permission:"manage-jobsheets",
    icon: <BriefcaseIcon className="h-6 w-6" />,
  }
];

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState("");
  const navigate = useNavigate();

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

  const accessiblePages = adminPages.filter(
    (page) => isSuperAdmin || permissions.includes(page.permission)
  );

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-gradient-to-b from-purple-500 via-pink-500 to-blue-500 text-white transition-all duration-300 ${
          sidebarOpen || sidebarHover ? "w-56" : "w-20"
        }`}
        onMouseEnter={() => !sidebarOpen && setSidebarHover(true)}
        onMouseLeave={() => !sidebarOpen && setSidebarHover(false)}
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="font-bold text-lg">Admin</h2>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)}>
              <ArrowLeftOnRectangleIcon className="h-6 w-6 text-white" />
            </button>
          )}
        </div>

        <nav className="mt-4 px-2">
          <ul className="space-y-2">
            {accessiblePages.map((page) => (
              <li key={page.name}>
                <Link
                  to={page.path}
                  className="flex items-center p-2 rounded-md hover:bg-white/10 transition"
                >
                  {page.icon}
                  {(sidebarOpen || sidebarHover) && (
                    <span className="ml-3 whitespace-nowrap text-sm font-medium">
                      {page.name}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-0 w-full px-2">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full p-2 rounded-md hover:bg-white/10"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            {(sidebarOpen || sidebarHover) && (
              <span className="ml-3 text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Removed the mobile topbar/hamburger menu */}
      {/* Main Content */}
      <main
        className="flex-1 ml-0 lg:ml-16"
        style={{
          marginLeft: sidebarOpen || sidebarHover ? 224 : 64,
        }}
      >
        <div className="h-full overflow-y-auto p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
