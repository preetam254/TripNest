import React from 'react';

const Sidebar = ({ menuItems = [], activeTab, setActiveTab }) => {
  return (
    <aside className="dashboard-sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
