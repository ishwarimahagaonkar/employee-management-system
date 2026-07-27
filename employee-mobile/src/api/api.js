
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = axios.create({
  baseURL: "https://api.spereon.codes/api",
  timeout: 15000,
});

// AUTO attach token
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Called when the server rejects our token. Registered by AuthContext so the
// app can drop to the login screen instead of sitting in a logged-in-looking
// state where every request silently fails.
let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// A stored token can stop being valid while the app still holds it -- the
// account was deactivated, or a logout elsewhere bumped the token version.
// Without this, every screen just renders empty with no explanation.
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    // The login screen's own 401 (wrong password) must reach it unchanged.
    const isLoginRequest = url.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      try {
        await AsyncStorage.multiRemove(["token", "user"]);
      } catch (e) {}

      if (onUnauthorized) onUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default API;