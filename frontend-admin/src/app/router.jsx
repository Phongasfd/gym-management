import {Routes, Route, Navigate} from 'react-router-dom'

import Dashboard from '../pages/Dashboard/Dashboard.jsx'
import Classes from '../pages/Classes/Classes.jsx'
import Checkins from '../pages/Checkins/Checkins.jsx'
import Login from '../pages/Login/Login.jsx'
import Members from '../pages/Members/Members.jsx'
import Packages from '../pages/Packages/Packages.jsx'
import Profile from '../pages/Profile/Profile.jsx'

import MainLayout from '../layouts/MainLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import ProtectedRoute from '../app/ProtectedRoute.jsx'


function AppRoutes(){

  return (
    <Routes>
      {/* Auto redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Auth Page */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected Internal Apps */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/classes"  element={<Classes />} />
        <Route path="/checkins" element={<Checkins />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/members"  element={<Members />} />
        <Route path="/packages"  element={<Packages />} />
        <Route path="/profile"  element={<Profile />} />
      </Route>

    </Routes>
  );
}

export default AppRoutes