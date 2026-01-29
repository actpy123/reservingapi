import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import SaveSessionModal from "./SaveSessionModal";

const Dashboard: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
   const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <div className="flex min-h-screen">
        <aside
          className={`${isSidebarCollapsed ? "w-14" : "w-64"} bg-blue-900 text-white transition-all duration-200 flex-shrink-0 overflow-hidden flex flex-col h-screen sticky top-0`}
        >
          <div className="p-4 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="truncate" title="Actuaria Consultants">
                <img
                  src="/logo.png"
                  alt="Actuaria Consultants"
                  className="h-10 w-auto object-contain max-w-full"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((v) => !v)}
              className="ml-auto bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm"
              aria-label="Toggle menu"
              aria-expanded={!isSidebarCollapsed}
              title="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          <nav className="px-2 space-y-2 flex-1">
            {!isSidebarCollapsed ? (
              <>
                <NavLink
                  to="/assumptions"
                  className={(args: { isActive: boolean }) =>
                    `${args.isActive ? "bg-white text-blue-800" : "bg-white/0 hover:bg-white/10 text-white"} w-full rounded-full px-3 py-3 text-left transition-colors whitespace-nowrap truncate block`
                  }
                  title="Assumptions"
                >
                  Assumptions
                </NavLink>
                <NavLink
                  to="/reserve"
                  className={(args: { isActive: boolean }) =>
                    `${args.isActive ? "bg-white text-blue-800" : "bg-white/0 hover:bg-white/10 text-white"} w-full rounded-full px-3 py-3 text-left transition-colors whitespace-nowrap truncate block`
                  }
                  title="Reserve Calculation"
                >
                  Reserve Calculation
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/assumptions"
                  className={(args: { isActive: boolean }) =>
                    `${args.isActive ? "bg-white text-blue-800" : "bg-white/0 hover:bg-white/10 text-white"} w-10 h-10 rounded-full flex items-center justify-center transition-colors`
                  }
                  title="Assumptions"
                  aria-label="Assumptions"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </NavLink>
                <NavLink
                  to="/reserve"
                  className={(args: { isActive: boolean }) =>
                    `${args.isActive ? "bg-white text-blue-800" : "bg-white/0 hover:bg-white/10 text-white"} w-10 h-10 rounded-full flex items-center justify-center transition-colors`
                  }
                  title="Reserve Calculate"
                  aria-label="Reserve Calculate"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </NavLink>
              </>
            )}
          </nav>
          <div className="p-4 mt-auto border-t border-white/10 backdrop-blur-sm">
            {!isSidebarCollapsed ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg px-4 py-3 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 font-medium"
                title="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg flex items-center justify-center transition-all duration-200 mx-auto shadow-lg hover:shadow-xl hover:scale-110"
                title="Logout"
                aria-label="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 p-8 min-w-0">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.995 }}
                transition={{ duration: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;