// Crash reporting, safe to call from anywhere.
//
// Firebase is loaded ONLY when the native module is present, and this file has
// been wrong about that twice -- both failures worth keeping written down,
// because they look like the same bug and are not:
//
//   1. Importing at module scope threw during metroRequire, before any of this
//      file ran, and the app did not start at all.
//   2. Moving to a lazy require inside a try/catch fixed that but not the real
//      problem: requiring the package on a Firebase-less build ALSO throws
//      out-of-band, from the module's own initialisation, after require() has
//      returned. That escapes the catch and shows a red screen.
//
// So the native module is probed first and the package is never required
// unless it is really there. A build without Firebase degrades to console
// logging, silently and in development only.
//
// Reporting must never be the thing that breaks the app.
import { NativeModules, TurboModuleRegistry } from "react-native";

let api = null;
let client = null;
let unavailable = false;

/**
 * Is the Firebase native side actually in this binary?
 *
 * This has to be answered BEFORE requiring the package. A try/catch around the
 * require is not sufficient: requiring it on a build without Firebase throws
 *
 *     Uncaught Error: Native module NativeRNFBTurboApp is not registered
 *
 * out-of-band, during the module's own initialisation, after require() has
 * already returned -- so it escapes the catch and surfaces as a red screen.
 * That is what the second version of this file did.
 *
 * TurboModuleRegistry.get() returns null for a missing module rather than
 * throwing (unlike getEnforcing), which makes it safe to probe. NativeModules
 * is checked too so this keeps working if the new architecture is off.
 */
function nativeFirebasePresent() {
  try {
    if (TurboModuleRegistry?.get?.("NativeRNFBTurboApp")) return true;
  } catch (err) {
    // Probing must never be what breaks startup.
  }

  try {
    if (NativeModules?.RNFBAppModule) return true;
  } catch (err) {
    // as above
  }

  return false;
}

function crashlytics() {
  if (client || unavailable) {
    return client;
  }

  if (!nativeFirebasePresent()) {
    unavailable = true;

    // Quiet, and only in development. This is the expected state on Expo Go
    // and on any build made without Firebase -- warning on every call would
    // put a console banner in front of the user for something working as
    // designed.
    if (__DEV__) {
      console.log("[crash] Firebase is not in this build; crash reporting is off");
    }

    return null;
  }

  try {
    // eslint-disable-next-line global-require
    api = require("@react-native-firebase/crashlytics");
    client = api.getCrashlytics();
  } catch (err) {
    unavailable = true;
    api = null;
    client = null;
    console.warn("[crash] Crashlytics unavailable:", err?.message);
  }

  return client;
}

// A breadcrumb. Crashlytics keeps the most recent ones and attaches them to
// whatever crash follows, which is how a native crash with a useless stack
// still tells you which step the user was on.
export function breadcrumb(message) {
  const c = crashlytics();

  if (c) {
    api.log(c, message);
  } else if (__DEV__) {
    console.log("[crash]", message);
  }
}

// Reports an error that did NOT kill the process. Fatal JS exceptions are
// captured automatically by the handler Crashlytics installs; these are the
// ones we catch ourselves and would otherwise swallow silently.
export function reportError(error, context) {
  const c = crashlytics();
  const err = error instanceof Error ? error : new Error(String(error));

  if (!c) {
    console.error("[crash]", context || "", err);
    return;
  }

  if (context) {
    api.log(c, context);
  }

  api.recordError(c, err);
}

// Ties every subsequent report to one employee, so a crash in the console can
// be matched to the person who reported it. Only the id and role go up -- no
// name, email or phone number.
export function identify(user) {
  const c = crashlytics();

  if (!c || !user) {
    return;
  }

  api.setUserId(c, String(user._id || user.id || ""));
  api.setAttributes(c, {
    role: String(user.role || "unknown"),
    companyId: String(user.companyId || ""),
  });
}

export function forget() {
  const c = crashlytics();

  if (c) {
    api.setUserId(c, "");
  }
}
