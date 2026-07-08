import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getProfile, type Profile } from "../../lib/supabase/profiles";
import { followUser, isFollowing, unfollowUser } from "../../lib/supabase/follows";
import { getPlantsForUser, plantCommonNameSubtitle, plantPrimaryName, type Plant } from "../../lib/supabase/plants";
import {
  getCareTasksForPlants,
  summarizeCareTasks,
  type PlantCareSummary,
  type PlantCareStatus,
} from "../../lib/supabase/care_tasks";
import { supabase } from "../../lib/supabase/client";
import { colors, fontAssets, getFonts, radius, spacing, statusColors } from "../../lib/theme";
import { getErrorMessage } from "../../lib/errors";

function statusText(status: PlantCareStatus): string {
  switch (status) {
    case "overdue":
      return "overdue";
    case "due_soon":
      return "due soon";
    case "healthy":
      return "healthy";
  }
}

function StatusPill({ label, status, fonts }: { label: string; status: PlantCareStatus; fonts: ReturnType<typeof getFonts> }) {
  const palette = statusColors[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.pillText, { color: palette.fg, fontFamily: fonts.bodyMedium }]}>
        {label}: {statusText(status)}
      </Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [following, setFollowing] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [careSummaries, setCareSummaries] = useState<Record<string, PlantCareSummary>>({});

  const [toggleStatus, setToggleStatus] = useState<"idle" | "toggling" | "error">("idle");
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx: state updates are
  // async, so a ref is needed to reliably block a second rapid tap.
  const isToggling = useRef(false);

  const fetchProfile = useCallback(() => {
    if (!id) {
      return;
    }

    Promise.all([
      getProfile(id),
      isFollowing(id),
      getPlantsForUser(id),
      supabase.auth.getUser().then(({ data }) => data.user?.id),
    ])
      .then(async ([profileData, followingData, plantsData, currentUserId]) => {
        setProfile(profileData);
        setFollowing(followingData);
        setIsOwnProfile(currentUserId === id);
        setPlants(plantsData);

        const tasks = await getCareTasksForPlants(plantsData.map((plant) => plant.id));
        const tasksByPlant: Record<string, typeof tasks> = {};
        for (const task of tasks) {
          (tasksByPlant[task.plant_id] ??= []).push(task);
        }

        const summaries: Record<string, PlantCareSummary> = {};
        for (const plant of plantsData) {
          summaries[plant.id] = summarizeCareTasks(tasksByPlant[plant.id] ?? []);
        }
        setCareSummaries(summaries);

        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  async function handleToggleFollow() {
    if (!id || isToggling.current) {
      return;
    }
    isToggling.current = true;

    setToggleStatus("toggling");
    setToggleError(null);

    try {
      if (following) {
        await unfollowUser(id);
        setFollowing(false);
      } else {
        await followUser(id);
        setFollowing(true);
      }
      setToggleStatus("idle");
    } catch (err) {
      setToggleError(getErrorMessage(err));
      setToggleStatus("error");
    } finally {
      isToggling.current = false;
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Profile" }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Profile" }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  const displayName = profile?.display_name;
  const initial = (displayName ?? "?").charAt(0).toUpperCase();

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: displayName ?? "Profile" }} />
      <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
        <Text style={[styles.avatarText, { fontFamily: fonts.display, color: colors.mossStrong }]}>{initial}</Text>
      </View>

      <Text
        style={[styles.name, { fontFamily: fonts.display, color: displayName ? colors.ink : colors.inkSoft }]}
      >
        {displayName ?? "No display name yet"}
      </Text>

      <Text style={[styles.bio, { fontFamily: fonts.body, color: profile?.bio ? colors.ink : colors.inkSoft }]}>
        {profile?.bio ?? "No bio yet"}
      </Text>

      {!isOwnProfile ? (
        <Pressable
          style={[
            styles.followButton,
            following
              ? { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }
              : { backgroundColor: colors.moss },
          ]}
          onPress={handleToggleFollow}
          disabled={toggleStatus === "toggling"}
        >
          {toggleStatus === "toggling" ? (
            <ActivityIndicator color={following ? colors.inkSoft : colors.paper} />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                { fontFamily: fonts.bodySemiBold, color: following ? colors.inkSoft : colors.paper },
              ]}
            >
              {following ? "Unfollow" : "Follow"}
            </Text>
          )}
        </Pressable>
      ) : null}

      {toggleStatus === "error" ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{toggleError}</Text>
      ) : null}

      <View style={styles.plantsSection}>
        <Text style={[styles.sectionLabel, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Plants</Text>

        {plants.length === 0 ? (
          <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>No plants yet</Text>
        ) : (
          plants.map((plant) => {
            const summary = careSummaries[plant.id];
            return (
              <Pressable
                key={plant.id}
                style={[styles.plantRow, { borderBottomColor: colors.line }]}
                onPress={() => router.push(`/plant/${plant.id}`)}
              >
                <View style={[styles.plantThumb, { backgroundColor: colors.sage }]} />
                <View style={styles.plantRowText}>
                  <Text style={[styles.plantName, { fontFamily: fonts.display, color: colors.ink }]}>
                    {plantPrimaryName(plant)}
                  </Text>
                  {plantCommonNameSubtitle(plant) ? (
                    <Text style={[styles.plantCommonName, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                      {plantCommonNameSubtitle(plant)}
                    </Text>
                  ) : null}
                  {plant.species ? (
                    <Text style={[styles.plantSpecies, { fontFamily: fonts.displayItalic, color: colors.inkSoft }]}>
                      {plant.species}
                    </Text>
                  ) : null}
                  <View style={styles.pillRow}>
                    {summary?.primary ? (
                      <StatusPill
                        label={summary.primary.type === "water" ? "watering" : summary.primary.type}
                        status={summary.primary.status}
                        fonts={fonts}
                      />
                    ) : null}
                    {summary?.watering ? (
                      <StatusPill label="watering" status={summary.watering.status} fonts={fonts} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 34,
  },
  name: {
    fontSize: 20,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  followButton: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    minWidth: 140,
  },
  followButtonText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
  },
  plantsSection: {
    width: "100%",
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
  },
  plantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  plantThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  plantRowText: {
    flex: 1,
  },
  plantName: {
    fontSize: 17,
  },
  plantCommonName: {
    fontSize: 13,
    marginTop: 2,
  },
  plantSpecies: {
    fontSize: 13.5,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
  },
});
