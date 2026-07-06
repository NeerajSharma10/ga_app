import { View, StyleSheet, type ViewProps } from "react-native";
import { colors, radius, spacing } from "../theme";

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style as object]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
