import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layout & Reusable
import Navbar from './components/common/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

// Core Pages
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import PropertyDetails from './pages/PropertyDetails.jsx';

// Auth Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import EmailVerification from './pages/EmailVerification.jsx';

// Dashboards
import UserDashboard from './pages/Dashboards/UserDashboard.jsx';
import HostDashboard from './pages/Dashboards/HostDashboard.jsx';
import AdminDashboard from './pages/Dashboards/AdminDashboard.jsx';

// AI Hub Pages
import AITripPlanner from './pages/AITripPlanner.jsx';
import AIChatAssistant from './pages/AIChatAssistant.jsx';

function App() {
  return (
    <div className="app-container">
      {/* Global Glass Navbar */}
      <Navbar />

      {/* Main Pages viewport routing */}
      <main className="main-content">
        <Routes>
          {/* Public Stays routes */}
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/property/:id" element={<PropertyDetails />} />

          {/* Authentication gate routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<EmailVerification />} />

          {/* AI Features hubs */}
          <Route path="/ai-planner" element={<AITripPlanner />} />
          <Route path="/ai-assistant" element={<AIChatAssistant />} />

          {/* Role Protected Dashboards */}
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute allowedRoles={['guest', 'host', 'admin']}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host-dashboard"
            element={
              <ProtectedRoute allowedRoles={['host', 'admin']}>
                <HostDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
