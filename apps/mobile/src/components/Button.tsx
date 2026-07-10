import { Pressable, Text, StyleSheet, ActivityIndicator, type PressableProps } from "react-native";
import { colors, radius, shadow, spacing } from "../theme";

interface Props extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export function Button({ title, variant = "primary", loading, disabled, style, ...rest }: Props) {
  const bg = variant === "primary" ? colors.accent : variant === "danger" ? colors.maintenance : "transparent";
  const border = variant === "secondary" ? colors.border : bg;
  const solid = variant !== "secondary";

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        solid ? shadow : null,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : disabled ? 0.5 : 1 },
        style as object,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: colors.text, fontWeight: "700", fontSize: 15 },
});
