import React from "react";
import { AuthProvider } from "./src/context/AuthContext";
import { SiteProvider } from "./src/context/SiteContext";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";



export default function App() {
  return (
    <ErrorBoundary name="App">
      {/* SiteProvider sits inside AuthProvider because it reads the session:
          it only loads sites once someone is signed in, and only for roles
          that have any. */}
      <AuthProvider>
        <SiteProvider>
          <AppNavigator />
        </SiteProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}