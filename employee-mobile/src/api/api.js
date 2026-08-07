
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// TEMPORARY: pointed at the local backend so the labour rework can be tested
// before it is deployed. Set USE_LOCAL_API back to false to return to
// production -- that is the only line that needs changing.
//
// The LAN address, not "localhost": on a phone, localhost is the phone itself.
// Both devices must be on the same Wi-Fi, and the backend already listens on
// 0.0.0.0:5000 so it accepts connections from the network rather than only
// from this machine.
//
// The __DEV__ guard means a release build can never ship pointing at a laptop,
// however this flag is left. Android also blocks cleartext http:// in release
// builds, so the local URL only works in development anyway.
const USE_LOCAL_API = true;
const LOCAL_API = "http://10.198.167.144:5000/api";
const PROD_API = "https://api.spereon.codes/api";

const API = axios.create({
  baseURL: USE_LOCAL_API && __DEV__ ? LOCAL_API : PROD_API,
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