'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../lib/context/AuthContext';
import { ToastProvider } from '../lib/context/ToastContext';

export default function Providers({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
