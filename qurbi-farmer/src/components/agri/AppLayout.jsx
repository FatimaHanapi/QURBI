import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/agri/BottomNav";
import Sidebar from "@/components/agri/Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <main className="px-5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 lg:px-10 lg:pb-12 lg:pt-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
