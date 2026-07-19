import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getProfile, type Profile } from "../../lib/supabase/profiles";
import { followUser, getFollowStatus, unfollowUser, type FollowStatus } from "../../lib/supabase/follows";
import { blockUser, getMyBlockStatus, unblockUser, type BlockStatus } from "../../lib/supabase/blocks";
import { getPlantsForUser, plantCommonNameSubtitle, plantPrimaryName, type Plant } from "../../lib/supabase/plants";
import {
  getCareTasksForPlants,
  summarizeCareTasks,
  type PlantCareSummary,
  type PlantCareStatus,
} from "../../lib/supabase/care_tasks";
import { supabase } from "../../lib/supabase/client";
import { PhotoThumb } from "../../components/PhotoThumb";
import { fontAssets, getFonts, getStatusColors, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { getErrorMessage } from "../../lib/errors";

function statusText(status: PlantCareStatus, t: (key: string) => string): string {
  return t(status === "due_soon" ? "index.status.dueSoon" : `index.status.${status}`);
}

function StatusPill({ label, status, fonts }: { label: string; status: PlantCareStatus; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const palette = getStatusColors(colors)[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.pillText, { color: palette.fg, fontFamily: fonts.bodyMedium }]}>
        {t("index.pill.labelStatus", { label, status: statusText(status, t) })}
      </Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");
  const [blockStatus, setBlockStatus] = useState<BlockStatus>("none");
  const [plants, setPlants] = useState<Plant[]>([]);
  const [careSummaries, setCareSummaries] = useState<Record<string, PlantCareSummary>>({});

  const [toggleStatus, setToggleStatus] = useState<"idle" | "toggling" | "error">("idle");
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blockActionStatus, setBlockActionStatus] = useState<"idle" | "acting" | "error">("idle");
  const [blockActionError, setBlockActionError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx: state updates are
  // async, so a ref is needed to reliably block a second rapid tap.
  const isToggling = useRef(false);
  const isActingOnBlock = useRef(false);

  const fetchProfile = useCallback(() => {
    if (!id) {
      return;
    }

    Promise.all([
      getProfile(id),
      getFollowStatus(id),
      getMyBlockStatus(id),
      getPlantsForUser(id),
      supabase.auth.getUser().then(({ data }) => data.user?.id),
    ])
      .then(async ([profileData, followStatusData, blockStatusData, plantsData, currentUserId]) => {
        setProfile(profileData);
        setFollowStatus(followStatusData);
        setBlockStatus(blockStatusData);
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
      if (followStatus === "none") {
        const { status } = await followUser(id);
        setFollowStatus(status);
      } else {
        // Covers both unfollowing an accepted follow and cancelling a
        // pending request -- both are just "remove my outgoing follow row".
        await unfollowUser(id);
        setFollowStatus("none");
      }
      setToggleStatus("idle");
    } catch (err) {
      setToggleError(getErrorMessage(err));
      setToggleStatus("error");
    } finally {
      isToggling.current = false;
    }
  }

  async function handleBlock() {
    if (!id || isActingOnBlock.current) {
      return;
    }
    isActingOnBlock.current = true;

    setConfirmingBlock(false);
    setBlockActionStatus("acting");
    setBlockActionError(null);

    try {
      await blockUser(id);
      // Blocking auto-removes any follow between the two accounts
      // server-side -- mirror that locally rather than refetching.
      setBlockStatus("blocked_by_me");
      setFollowStatus("none");
      setBlockActionStatus("idle");
    } catch (err) {
      setBlockActionError(getErrorMessage(err));
      setBlockActionStatus("error");
    } finally {
      isActingOnBlock.current = false;
    }
  }

  async function handleUnblock() {
    if (!id || isActingOnBlock.current) {
      return;
    }
    isActingOnBlock.current = true;

    setBlockActionStatus("acting");
    setBlockActionError(null);

    try {
      await unblockUser(id);
      setBlockStatus("none");
      setBlockActionStatus("idle");
    } catch (err) {
      setBlockActionError(getErrorMessage(err));
      setBlockActionStatus("error");
    } finally {
      isActingOnBlock.current = false;
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("userProfile.loadingTitle") }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("userProfile.loadingTitle") }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>
          {t("userProfile.error", { error: error ?? "" })}
        </Text>
      </View>
    );
  }

  const displayName = profile?.display_name;
  const atUsername = `@${profile?.username}`;

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: displayName ?? atUsername }} />
      <PhotoThumb uri={profile?.avatar_url ?? null} size={88} radius={radius.lg} />

      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
        {displayName ?? atUsername}
      </Text>

      {displayName ? (
        <Text style={[styles.username, { fontFamily: fonts.body, color: colors.inkSoft }]}>{atUsername}</Text>
      ) : null}

      <Text style={[styles.bio, { fontFamily: fonts.body, color: profile?.bio ? colors.ink : colors.inkSoft }]}>
        {profile?.bio ?? t("userProfile.noBio")}
      </Text>

      {!isOwnProfile && blockStatus === "blocked_by_me" ? (
        <View style={styles.blockedSection}>
          <Text style={[styles.blockedText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("userProfile.blockedNotice")}
          </Text>
          <Pressable
            style={[styles.dangerOutlineButton, { borderColor: colors.coral }]}
            onPress={handleUnblock}
            disabled={blockActionStatus === "acting"}
          >
            {blockActionStatus === "acting" ? (
              <ActivityIndicator color={colors.coral} />
            ) : (
              <Text style={[styles.dangerOutlineButtonText, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                {t("common.unblock")}
              </Text>
            )}
          </Pressable>
        </View>
      ) : !isOwnProfile ? (
        <>
          <Pressable
            style={[
              styles.followButton,
              followStatus === "none"
                ? { backgroundColor: colors.moss }
                : { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
            ]}
            onPress={handleToggleFollow}
            disabled={toggleStatus === "toggling"}
          >
            {toggleStatus === "toggling" ? (
              <ActivityIndicator color={followStatus === "none" ? colors.paper : colors.inkSoft} />
            ) : (
              <Text
                style={[
                  styles.followButtonText,
                  { fontFamily: fonts.bodySemiBold, color: followStatus === "none" ? colors.paper : colors.inkSoft },
                ]}
              >
                {followStatus === "none"
                  ? t("userProfile.followButton.follow")
                  : followStatus === "pending"
                    ? t("userProfile.followButton.requested")
                    : t("userProfile.followButton.unfollow")}
              </Text>
            )}
          </Pressable>

          {toggleStatus === "error" ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{toggleError}</Text>
          ) : null}

          {confirmingBlock ? (
            <View style={[styles.confirmBox, { borderColor: colors.coral, backgroundColor: colors.coralSoft }]}>
              <Text style={[styles.confirmText, { fontFamily: fonts.body, color: colors.ink }]}>
                {t("userProfile.confirmBlock.message")}
              </Text>
              <View style={styles.confirmActions}>
                <Pressable onPress={handleBlock} hitSlop={8}>
                  <Text style={[styles.confirmAction, { fontFamily: fonts.bodySemiBold, color: colors.coral }]}>
                    {t("userProfile.confirmBlock.confirm")}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setConfirmingBlock(false)} hitSlop={8}>
                  <Text style={[styles.confirmAction, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                    {t("common.cancel")}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmingBlock(true)} hitSlop={8}>
              <Text style={[styles.blockLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                {t("userProfile.blockLink")}
              </Text>
            </Pressable>
          )}
        </>
      ) : null}

      {blockActionStatus === "error" ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{blockActionError}</Text>
      ) : null}

      <View style={styles.plantsSection}>
        <Text style={[styles.sectionLabel, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
          {t("tabsLayout.plants.title")}
        </Text>

        {!isOwnProfile && blockStatus === "blocked_by_me" ? (
          <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("userProfile.blockedNotice")}
          </Text>
        ) : !isOwnProfile && profile?.profile_visibility === "private" && followStatus !== "accepted" ? (
          <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("userProfile.plantsSection.privateNotice")}
          </Text>
        ) : plants.length === 0 ? (
          <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("index.emptyState")}
          </Text>
        ) : (
          plants.map((plant) => {
            const summary = careSummaries[plant.id];
            return (
              <Pressable
                key={plant.id}
                style={[styles.plantRow, { borderBottomColor: colors.line }]}
                onPress={() => router.push(`/plant/${plant.id}`)}
              >
                <PhotoThumb uri={plant.photo_urls?.[0] ?? null} size={56} radius={radius.sm} />
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
                        label={t(`index.careType.${summary.primary.type === "water" ? "watering" : summary.primary.type}`)}
                        status={summary.primary.status}
                        fonts={fonts}
                      />
                    ) : null}
                    {summary?.watering ? (
                      <StatusPill label={t("index.careType.watering")} status={summary.watering.status} fonts={fonts} />
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
  name: {
    fontSize: 20,
  },
  username: {
    fontSize: 13,
    marginTop: -spacing.xs,
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
  blockedSection: {
    marginTop: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
  },
  blockedText: {
    fontSize: 14,
  },
  dangerOutlineButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    minWidth: 140,
  },
  dangerOutlineButtonText: {
    fontSize: 14,
  },
  blockLink: {
    marginTop: spacing.xs,
    fontSize: 12.5,
  },
  confirmBox: {
    marginTop: spacing.xs,
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  confirmText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  confirmAction: {
    fontSize: 14,
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
