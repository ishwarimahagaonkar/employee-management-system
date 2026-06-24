import React, { useState } from "react";
import API from "../../api/api.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

const handleLogin = async () => {
  try {
    console.log("LOGIN CLICKED");

    const res = await API.post("/auth/login", {
      email: email.trim(),
      password: password,
    });

    console.log("LOGIN RESPONSE STATUS:", res.status);
    console.log("LOGIN RESPONSE DATA:", res.data);

    const { token, user } = res.data;

    if (!token) {
      alert("No token received from server");
      return;
    }

    await AsyncStorage.setItem("token", token);

    isLoggedIn(true);

  } catch (err) {
    console.log("LOGIN ERROR FULL:", err.response?.data || err.message);
    alert(err.response?.data?.message || "Login failed");
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        

        <Text style={styles.heading}>
          Login
        </Text>

        <Text style={styles.subHeading}>
          Login to access your account
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Email Address</Text>

        <TextInput
          placeholder="name@company.com"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>

        <TextInput
          placeholder="Enter password"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
        >
          <Text style={styles.loginButtonText}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        @2026 Obsidian.dev • all rights reserved.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    marginBottom: 40,
  },

  brand: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 4,
    color: "#2563EB",
    marginBottom: 18,
  },

  heading: {
    fontSize: 34,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },

  subHeading: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: "#64748B",
    textAlign: "center",
  },

  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    marginBottom: 18,
  },

  loginButton: {
    height: 56,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    marginTop: 30,
    color: "#94A3B8",
    fontSize: 12,
  },
});