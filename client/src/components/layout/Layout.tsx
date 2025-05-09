import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <div className="flex min-h-screen">
      {/* Drawer Overlay (mobile only) */}
      <div 
        className={`drawer-overlay fixed inset-0 bg-black md:hidden z-30 ${
          drawerOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleDrawer}
      />

      {/* Sidebar */}
      <Sidebar isOpen={drawerOpen} />

      {/* Main Content Area */}
      <div className="content-area flex-1 transition-all duration-300">
        <TopBar toggleDrawer={toggleDrawer} />
        {children}
      </div>
    </div>
  );
};

export default Layout;
