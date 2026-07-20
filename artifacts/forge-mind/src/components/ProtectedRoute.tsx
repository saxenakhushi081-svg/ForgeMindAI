import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Redirect } from 'wouter';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <>{children}</>;
}