import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { reportError } from "../services/crashReporter";

// A render error anywhere in the tree used to take the entire app down: on a
// release build Android kills the process on an unhandled JS exception, so an
// employee just saw the app vanish with nothing to report back. This keeps the
// app alive, shows what actually broke, and lets them retry the screen.
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const where = this.props.name || "screen";

    // Surfaces in `adb logcat` / the Metro console when reproducing a report.
    console.error(`[${where}] crashed:`, error, info?.componentStack);

    // Catching the error here means it never becomes a fatal exception, so
    // the handler Crashlytics installs never sees it. Without this call the
    // boundary would quietly hide exactly the crashes we added Crashlytics
    // to find. The component stack goes along because a minified release
    // stack alone rarely says which screen was on screen.
    reportError(error, `ErrorBoundary(${where})${info?.componentStack || ""}`);
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={26} color="#DC2626" />
          </View>

          <Text style={styles.title}>This screen ran into a problem</Text>
          <Text style={styles.message}>
            The rest of the app still works. Please share the details below with your
            administrator.
          </Text>

          <View style={styles.detailBox}>
            <Text style={styles.detailText} selectable>
              {String(error?.message || error)}
            </Text>
          </View>

          <TouchableOpacity style={styles.retryBtn} onPress={this.retry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

// Wraps a screen component so one broken screen can't close the app. Called at
// module scope, never inside render -- a new component type on every render
// would remount the screen and throw its state away.
export function withErrorBoundary(Component, name) {
  function Guarded(props) {
    return (
      <ErrorBoundary name={name}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  Guarded.displayName = `WithErrorBoundary(${name || Component.displayName || Component.name || "Screen"})`;
  return Guarded;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 28,
  },

  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 6,
    textAlign: "center",
  },

  message: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },

  detailBox: {
    alignSelf: "stretch",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginTop: 16,
  },

  detailText: {
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 17,
  },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#112250",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 16,
  },

  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
