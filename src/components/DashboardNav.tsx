"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Car,
  Battery,
  BarChart3,
  LogOut,
  User,
  UserCheck,
} from "lucide-react";

const ADMIN_EMAIL = (typeof process.env.NEXT_PUBLIC_EVCARE_ADMIN_EMAIL === "string" && process.env.NEXT_PUBLIC_EVCARE_ADMIN_EMAIL)
  ? process.env.NEXT_PUBLIC_EVCARE_ADMIN_EMAIL
  : "vishwagohil21@gmail.com";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/fleet", label: "Fleet", icon: Car, sub: "Vehicle Management" },
  { href: "/dashboard/battery", label: "Battery", icon: Battery, sub: "Health Monitor" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, sub: "Reports & Export" },
];

const adminNavItem = { href: "/dashboard/approvals", label: "Approvals", icon: UserCheck, sub: "Approve new users" };

export function DashboardNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-blue-600">EVC</span>
          <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
            EVCARE
          </span>
        </Link>
      </div>

      {/* User section */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          Welcome back
        </p>
        <p className="font-semibold text-gray-900 truncate" title={user?.email}>
          {displayName}
        </p>
        {user?.email && user.email !== displayName && (
          <p className="text-sm text-gray-500 truncate" title={user.email}>
            {user.email}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600"
          >
            <User className="w-3.5 h-3.5" />
            Profile
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (() => {
          const ItemIcon = adminNavItem.icon;
          return (
            <Link
              href={adminNavItem.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                pathname === adminNavItem.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <ItemIcon className={`w-5 h-5 shrink-0 ${pathname === adminNavItem.href ? "text-blue-600" : "text-gray-500"}`} />
              <div>
                <span className="font-medium block">{adminNavItem.label}</span>
                <span className="text-xs text-gray-500">{adminNavItem.sub}</span>
              </div>
            </Link>
          );
        })()}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              />
              <div>
                <span className="font-medium block">{item.label}</span>
                {item.sub && (
                  <span className="text-xs text-gray-500">{item.sub}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">EVCare Admin</p>
        <p className="text-xs text-gray-400">Electric Vehicle Fleet</p>
      </div>
    </aside>
  );
}
