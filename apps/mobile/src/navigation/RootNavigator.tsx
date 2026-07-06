import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { useAuthStore } from "../lib/auth-store";
import { LoginScreen } from "../screens/LoginScreen";
import { AppTabs } from "./AppTabs";
import { colors } from "../theme";

const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.panel, border: colors.border, primary: colors.accent, text: colors.text },
};

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <NavigationContainer theme={navigationTheme}>{token ? <AppTabs /> : <LoginScreen />}</NavigationContainer>;
}
