import React, { createContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setUnauthorizedHandler } from "../api/api.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkLogin();
  }, []);

  // The server can reject a stored token at any time (account deactivated, or
  // a logout elsewhere invalidated it). Drop straight to the login screen
  // rather than leaving the user in an app where nothing loads.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      Alert.alert("Session expired", "Please log in again to continue.");
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const checkLogin = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      setToken(storedToken);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else if (storedToken) {
        // Older sessions logged in before user data was cached locally.
        const res = await api.get("/employees/me");
        await AsyncStorage.setItem("user", JSON.stringify(res.data));
        setUser(res.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken, newUser) => {
    await AsyncStorage.setItem("token", newToken);
    await AsyncStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};