import React, { createContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setUnauthorizedHandler } from "../api/api.js";
import { getApiErrorMessage } from "../utils/apiError.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionError, setSessionError] = useState(null);

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

  // Restores the stored session. Which app a person sees depends on their role,
  // so a token whose user record can't be loaded is reported rather than used:
  // the old code set the token anyway, and AppNavigator's role checks then fell
  // through to the employee app -- an admin whose profile call failed (a network
  // blip, or the 429s during the rate-limit outage) landed in the wrong app with
  // no route back to the login screen.
  const checkLogin = async () => {
    setSessionError(null);

    try {
      const storedToken = await AsyncStorage.getItem("token");

      if (!storedToken) {
        setToken(null);
        setUser(null);
        return;
      }

      const storedUser = await AsyncStorage.getItem("user");

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          return;
        } catch (parseError) {
          // Corrupt cache must not strand the app -- drop it and refetch.
          await AsyncStorage.removeItem("user");
        }
      }

      // Sessions from before user data was cached locally, or a dropped cache.
      const res = await api.get("/employees/me");
      await AsyncStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);
      setToken(storedToken);
    } catch (error) {
      setSessionError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const retrySession = () => {
    setLoading(true);
    checkLogin();
  };

  const login = async (newToken, newUser) => {
    await AsyncStorage.setItem("token", newToken);
    await AsyncStorage.setItem("user", JSON.stringify(newUser));
    setSessionError(null);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setSessionError(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        sessionError,
        retrySession,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};