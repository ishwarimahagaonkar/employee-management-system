import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../api/api.js";
import { AuthContext } from "./AuthContext";
import { getApiErrorMessage } from "../utils/apiError.js";

export const SiteContext = createContext();

const STORAGE_KEY = "activeSiteId";

/**
 * The active site, shared by every labour screen.
 *
 * This used to be local useState inside each screen, which meant three
 * problems at once: the choice reset whenever you navigated away, each screen
 * kept its OWN idea of the current site (so Attendance could be on Site B
 * while Daily Report was still on Site A), and it always snapped back to
 * whichever site happened to be created most recently.
 *
 * Holding it here and persisting it makes "the site I am working on today" a
 * property of the session rather than of a screen.
 */
export const SiteProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);

  const [sites, setSites] = useState([]);
  const [activeSiteId, setActiveSiteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Roles with no site access never trigger a fetch -- an employee opening the
  // app shouldn't be making a request that can only 403.
  const canSeeSites = ["admin", "manager", "supervisor"].includes(user?.role);

  const loadSites = useCallback(async () => {
    if (!token || !canSeeSites) {
      setSites([]);
      setActiveSiteId(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await api.get("/sites");
      const list = res.data.sites || [];
      setSites(list);

      // Restore last choice, but only if that site is still visible: a
      // supervisor can be reassigned, and silently working on a site you no
      // longer run would be worse than being asked to pick again.
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const storedIsValid = stored && list.some((s) => String(s._id) === String(stored));

      if (storedIsValid) {
        setActiveSiteId(stored);
      } else {
        // Prefer an active site over a deactivated one when falling back.
        const fallback = list.find((s) => s.status === "active") || list[0] || null;
        setActiveSiteId(fallback ? String(fallback._id) : null);
        if (stored && !storedIsValid) await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, canSeeSites]);

  useEffect(() => {
    setLoading(true);
    loadSites();
  }, [loadSites]);

  const changeSite = useCallback(async (siteId) => {
    setActiveSiteId(siteId ? String(siteId) : null);

    // Persisting must never be what breaks switching sites, so a storage
    // failure is swallowed -- the choice still applies for this session.
    try {
      if (siteId) await AsyncStorage.setItem(STORAGE_KEY, String(siteId));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // ignore
    }
  }, []);

  const activeSite = sites.find((s) => String(s._id) === String(activeSiteId)) || null;

  return (
    <SiteContext.Provider
      value={{
        sites,
        activeSite,
        activeSiteId,
        loading,
        error,
        changeSite,
        // Called after creating a site, so the new one shows up without a
        // full app reload.
        refreshSites: loadSites,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useActiveSite = () => useContext(SiteContext);
