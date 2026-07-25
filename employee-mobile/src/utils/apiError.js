// Turns an axios/network error into a message worth showing a user.
//
// Screens used to swallow errors in empty catch blocks, which made a failed
// request look identical to "there is no data" -- impossible to diagnose from
// the app. Every data fetch should now surface one of these instead.

export function getApiErrorMessage(err) {
  // Thrown by our own code (permission/location failures) -- already friendly.
  if (err && !err.response && !err.request && err.message) {
    return err.message;
  }

  if (err?.code === "ECONNABORTED") {
    return "The server took too long to respond. Check your connection and try again.";
  }

  if (!err?.response) {
    return "No internet connection. Check your network and try again.";
  }

  const { status, data } = err.response;
  const serverMessage = data?.message;

  if (status === 401) {
    return serverMessage || "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return serverMessage || "You don't have permission to view this.";
  }

  if (status === 404) {
    return serverMessage || "That wasn't found on the server.";
  }

  if (status === 429) {
    return serverMessage || "Too many requests. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "The server had a problem. Please try again in a moment.";
  }

  return serverMessage || "Something went wrong. Please try again.";
}

// True when the session is no longer valid and the user must log in again.
export function isAuthError(err) {
  return err?.response?.status === 401;
}
