import React, { useContext, useState } from "react";
import API from "../../api/api.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { AuthContext } from "../../context/AuthContext.js";
import { getApiErrorMessage } from "../../utils/apiError.js";

// Read from app.json rather than hardcoded, so the footer can be trusted
// when checking whether a phone is actually on the latest build.
const APP_VERSION = Constants.expoConfig?.version || "unknown";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const {login} = useContext(AuthContext);

const handleLogin = async () => {
  if (loading) return;

  if (!email.trim() || !password) {
    setError("Enter your email and password.");
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const res = await API.post("/auth/login", {
      email: email.trim(),
      password: password,
    });


    const { token, user } = res.data;

    if (!token) {
      setError("The server didn't return a login token. Please try again.");
      return;
    }

    await login(token, user);//Context handling storage and state

  } catch (err) {
    // Shown inline rather than in an alert, and specific: a bare
    // "Login failed" gave no way to tell a wrong password from the phone
    // simply not reaching the server.
    setError(getApiErrorMessage(err));
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#112250", "#1a3a8c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.brandRow}>
              <Image
                source={require("../../../assets/logo-white.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.brandName}>StaffTrack</Text>
            </View>

            <Text style={styles.heading}>Welcome back</Text>

            <Text style={styles.subHeading}>
              Sign in to continue to your workspace
            </Text>
          </LinearGradient>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Email Address</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                placeholder="name@company.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Password</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                placeholder="Enter password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>
                    Sign In
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            @2026 StaffTrack • all rights reserved.{"\n"} version {APP_VERSION}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  flex: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  hero: {
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },

  logo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },

  brandName: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: "#FFFFFF",
  },

  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  subHeading: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },

  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginTop: -28,
    shadowColor: "#112250",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
    marginBottom: 18,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#0F172A",
  },

  loginButton: {
    flexDirection: "row",
    height: 56,
    backgroundColor: "#112250",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#112250",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },

  footer: {
    textAlign: "center",
    marginTop: 26,
    color: "#94A3B8",
    fontSize: 12,
  },
});