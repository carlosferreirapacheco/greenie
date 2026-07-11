import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";
import { getPrivacyPolicyUpdatedAt, isConsentCurrent } from "../lib/supabase/consent";
import { onConsentAccepted } from "../lib/consentEvents";
import { colors, fontAssets, getFonts } from "../lib/theme";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // null = never accepted; undefined = not yet known. Compared against
  // the policy's effective date below -- a stamp older than the policy
  // needs re-consent just like a null one.
  const [consentedAt, setConsentedAt] = useState<string | null | undefined>(undefined);
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null | undefined>(undefined);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const segments = useSegments();

  // supabase-js re-emits SIGNED_IN for the same user on tab focus and
  // token refresh -- only an actual account switch should reset the
  // resolved consent state (resetting on every event unmounts the whole
  // app to the spinner and can cascade into an update loop).
  const consentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const syncSession = (newSession: Session | null) => {
      const userId = newSession?.user?.id ?? null;
      if (userId !== consentUserIdRef.current) {
        consentUserIdRef.current = userId;
        setConsentedAt(undefined);
      }
      setSession(newSession);
    };

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session);
      setSessionLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      syncSession(newSession);
    });

    // The welcome screen signals acceptance directly, so the gate opens
    // before it navigates away -- no refetch race.
    const unsubscribeConsent = onConsentAccepted(() => {
      setConsentedAt(new Date().toISOString());
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeConsent();
    };
  }, []);

  // Accounts whose consent isn't current -- never accepted (fresh OAuth
  // signups, pre-consent-era accounts) or accepted before the policy's
  // current effective date -- are routed to /welcome until they accept.
  // One fetch per signed-in user (app_config needs a session to read).
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("accepted_privacy_at")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (!cancelled && !error && data) {
          setConsentedAt(data.accepted_privacy_at);
        }
      });
    getPrivacyPolicyUpdatedAt()
      .then((value) => {
        if (!cancelled) {
          setPolicyUpdatedAt(value);
        }
      })
      .catch(() => {
        // isConsentCurrent fails open on a null policy date -- a config
        // read hiccup must not lock users out behind the consent gate.
        if (!cancelled) {
          setPolicyUpdatedAt(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const fonts = getFonts(fontsLoaded && !fontError);

  if (
    !sessionLoaded ||
    (!fontsLoaded && !fontError) ||
    (session && (consentedAt === undefined || policyUpdatedAt === undefined))
  ) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  const screenOptions = {
    headerStyle: { backgroundColor: colors.paper },
    headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
    headerTintColor: colors.moss,
    headerTitleAlign: "center" as const,
    contentStyle: { backgroundColor: colors.paper },
  };

  const inAuthGroup = segments[0] === "sign-in" || segments[0] === "sign-up";
  // Readable signed-out too: the sign-up form asks for consent to this
  // policy, so it can't sit behind the session gate.
  const inPublicGroup = segments[0] === "privacy-policy";

  if (!session && !inAuthGroup && !inPublicGroup) {
    return <Redirect href="/sign-in" />;
  }

  if (session && inAuthGroup) {
    return <Redirect href="/" />;
  }

  // Consent gate: everything except the welcome screen itself and the
  // privacy policy (which the welcome screen links to) waits until the
  // account's consent is current -- exists AND is no older than the
  // policy's effective date.
  const consentCurrent = isConsentCurrent(consentedAt ?? null, policyUpdatedAt ?? null);

  if (session && !consentCurrent && segments[0] !== "welcome" && !inPublicGroup) {
    return <Redirect href="/welcome" />;
  }

  // Nothing to review once current consent is on record.
  if (session && consentCurrent && segments[0] === "welcome") {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={screenOptions} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
