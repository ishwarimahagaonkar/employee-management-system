import {
  getCrashlytics,
  log,
  recordError,
  setAttributes,
  setUserId,
} from "@react-native-firebase/crashlytics";

// Crashlytics is a native module, so it only exists in a real build -- in Expo
// Go, and in any JS-only test run, getCrashlytics() throws. Every call goes
// through here so a missing native module degrades to a console line instead
// of taking down the very screen we are trying to get a crash report out of.
// Reporting must never be the thing that crashes the app.
let client = null;
let unavailable = false;

function crashlytics() {
  if (client || unavailable) {
    return client;
  }

  try {
    client = getCrashlytics();
  } catch (err) {
    unavailable = true;
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
    log(c, message);
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
    log(c, context);
  }

  recordError(c, err);
}

// Ties every subsequent report to one employee, so a crash in the console can
// be matched to the person who reported it. Only the id and role go up -- no
// name, email or phone number.
export function identify(user) {
  const c = crashlytics();

  if (!c || !user) {
    return;
  }

  setUserId(c, String(user._id || user.id || ""));
  setAttributes(c, {
    role: String(user.role || "unknown"),
    companyId: String(user.companyId || ""),
  });
}

export function forget() {
  const c = crashlytics();

  if (c) {
    setUserId(c, "");
  }
}
