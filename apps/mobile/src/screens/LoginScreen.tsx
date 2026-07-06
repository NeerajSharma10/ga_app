import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import type { LoginRequest, LoginResponse } from "@ga-app/shared-types";
import { api, ApiError } from "../lib/api";
import { useAuthStore } from "../lib/auth-store";
import { colors, spacing, typography } from "../theme";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";

export function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { phone, password } satisfies LoginRequest);
      setSession(res.token, res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.brand}>
        <Text style={styles.brandMark}>GA</Text>
        <Text style={styles.title}>Gamer's Academy</Text>
        <Text style={styles.subtitle}>Play · Train · Repeat</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="10-digit mobile number"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Log in" onPress={handleLogin} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.xl, gap: spacing.xxl },
  brand: { alignItems: "center", gap: spacing.xs },
  brandMark: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 1,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textDim, letterSpacing: 2, fontSize: 12, textTransform: "uppercase" },
  form: { gap: spacing.lg },
  error: { color: colors.maintenance, fontSize: 13, textAlign: "center" },
});
