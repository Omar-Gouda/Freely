import { ActivityIndicator, Pressable, ScrollView, SafeAreaView, StyleSheet, Text } from "react-native";

import type { Notice } from "../app-types";
import { palette, spacing } from "../theme";
import { Banner, Field, uiStyles } from "../components/ui";

export function LoginScreen(props: {
  configurationError: string;
  notice: Notice;
  signingIn: boolean;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={uiStyles.eyebrow}>Freely Mobile</Text>
        <Text style={uiStyles.heroTitle}>A cross-platform hiring workspace powered by the same live Freely backend.</Text>
        <Text style={uiStyles.heroCopy}>
          Recruiters, org heads, and admins all use the same Supabase auth, storage, and operational APIs as the website.
        </Text>

        {!!props.configurationError && <Banner notice={{ tone: "error", message: props.configurationError }} />}
        {props.notice && <Banner notice={props.notice} />}

        <Field label="Email" value={props.email} onChangeText={props.onEmailChange} keyboardType="email-address" placeholder="name@company.com" />
        <Field label="Password" value={props.password} onChangeText={props.onPasswordChange} secureTextEntry placeholder="Your password" />

        <Pressable style={styles.button} onPress={props.onSignIn}>
          {props.signingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Open workspace</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md
  },
  button: {
    minHeight: 48,
    backgroundColor: palette.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15
  }
});
