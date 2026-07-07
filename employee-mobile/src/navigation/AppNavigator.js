import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";

import AuthStack from "./AuthStack";
import MainStack from "./MainStack";
import AdminDrawerNavigator from "./AdminDrawerNavigator";

import { AuthContext } from "../context/AuthContext";

export default function AppNavigator() {
  const { token, user, loading } = useContext(AuthContext);

  if (loading) {
    return null;
  }

  const renderApp = () => {
    if (!token) return <AuthStack />;
    if (user?.role === "admin") return <AdminDrawerNavigator />;
    return <MainStack />;
  };

  return <NavigationContainer>{renderApp()}</NavigationContainer>;
}