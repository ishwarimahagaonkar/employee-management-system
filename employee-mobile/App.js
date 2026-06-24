import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      const storedToken = await AsyncStorage.getItem("token");

      console.log("STORED TOKEN:", storedToken);

      setToken(storedToken);
      setLoading(false);
    };

    checkLogin();
  }, []);

  if (loading) return null;

  return <AppNavigator isLoggedIn={!!token} />;
}