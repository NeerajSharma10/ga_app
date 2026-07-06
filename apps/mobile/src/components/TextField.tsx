import { View, Text, TextInput, StyleSheet, type TextInputProps } from "react-native";
import { colors, radius, spacing } from "../theme";

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: Props) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, error ? { borderColor: colors.maintenance } : null, style as object]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textDim, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    backgroundColor: colors.panelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.maintenance, fontSize: 12 },
});
