import React, { lazy } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Layouts
const AuthLayout = lazy(() => import('./components/layout/AuthLayout'))
const MainLayout = lazy(() => import('./components/layout/MainLayout'))

// Auth Pages
const Login = lazy(() => import('./pages/Auth/Login'))
const Register = lazy(() => import('./pages/Auth/Register'))
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'))

// Main Pages
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
const POS = lazy(() => import('./pages/POS/POS'))
const Products = lazy(() => import('./pages/Products/Products'))
const Inventory = lazy(() => import('./pages/Inventory/Inventory'))
const Customers = lazy(() => import('./pages/Customers/Customers'))
const Sales = lazy(() => import('./pages/Sales/Sales'))
const Finance = lazy(() => import('./pages/Finance/Finance'))
const Documents = lazy(() => import('./pages/Documents/Documents'))
const Subscription = lazy(() => import('./pages/Subscription/Subscription'))
const Security = lazy(() => import('./pages/Security/Security'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const Audit = lazy(() => import('./pages/Audit/Audit'))
const Profile = lazy(() => import('./pages/Profile/Profile'))

// Protected Route Component
const ProtectedRoute = () => {
  const { user } = useAuthStore()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

// Auth Route Component (redirect if already logged in)
const AuthRoute = () => {
  const { user } = useAuthStore()
  return !user ? <Outlet /> : <Navigate to="/dashboard" replace />
}

const RouterConfig = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/products" element={<Products />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/security" element={<Security />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Error Routes */}
      <Route path="/404" element={<div>Página não encontrada</div>} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

export default RouterConfig
