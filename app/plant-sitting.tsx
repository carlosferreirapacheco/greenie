import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Pressable, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  acceptSittingRequest,
  cancelSittingRequest,
  computeSittingAccessState,
  declineSittingRequest,
  formatSittingPeriod,
  getMySitters,
  getMySittingAssignments,
  getMySittingRequests,
  getSittersHistory,
  type PlantSittingAssignment,
  type SittingAccessState,
} from "../lib/supabase/plant_sitting";
import { type Profile } from "../lib/supabase/profiles";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

function accessStateLabel(state: SittingAccessState): string {
  switch (state) {
    case "pending":
      return "Pending";
    case "upcoming":
      return "Upcoming";
    case "active":
      return "Active";
    case "ended":
      return "Ended";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
  }
}

function RequestRow({
  assignment,
  fonts,
  busy,
  onAccept,
  onDecline,
}: {
  assignment: PlantSittingAssignment & { owner: Profile };
  fonts: ReturnType<typeof getFonts>;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable style={styles.rowLink} onPress={() => router.push(`/user/${assignment.owner.id}`)}>
        <PhotoThumb uri={assignment.owner.avatar_url} size={44} radius={radius.sm} />
        <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
          {assignment.owner.display_name ?? `@${assignment.owner.username}`}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color={colors.moss} />
        ) : (
          <>
            <Pressable onPress={onAccept} hitSlop={8}>
              <Text style={[styles.acceptLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Accept</Text>
            </Pressable>
            <Pressable onPress={onDecline} hitSlop={8}>
              <Text style={[styles.declineLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                Decline
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function AssignmentRow({
  assignment,
  fonts,
}: {
  assignment: PlantSittingAssignment & { owner: Profile };
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors } = useTheme();
  const state = computeSittingAccessState(assignment);
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.line }]}
      onPress={() => router.push(`/user/${assignment.owner.id}`)}
    >
      <PhotoThumb uri={assignment.owner.avatar_url} size={44} radius={radius.sm} />
      <View style={styles.rowText}>
        <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
          {assignment.owner.display_name ?? `@${assignment.owner.username}`}
        </Text>
        <Text style={[styles.stateText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {accessStateLabel(state)}
        </Text>
      </View>
    </Pressable>
  );
}

function SentRequestRow({
  assignment,
  fonts,
  busy,
  confirming,
  onCancelPress,
  onConfirmCancel,
  onCancelCancel,
}: {
  assignment: PlantSittingAssignment & { sitter: Profile };
  fonts: ReturnType<typeof getFonts>;
  busy: boolean;
  confirming: boolean;
  onCancelPress: () => void;
  onConfirmCancel: () => void;
  onCancelCancel: () => void;
}) {
  const { colors } = useTheme();
  const canCancel = assignment.status === "pending" || assignment.status === "accepted";
  const period = formatSittingPeriod(assignment.starts_at, assignment.ends_at);
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable style={styles.rowLink} onPress={() => router.push(`/user/${assignment.sitter.id}`)}>
        <PhotoThumb uri={assignment.sitter.avatar_url} size={44} radius={radius.sm} />
        <View style={styles.rowText}>
          <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
            {assignment.sitter.display_name ?? `@${assignment.sitter.username}`}
          </Text>
          <Text style={[styles.stateText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {accessStateLabel(computeSittingAccessState(assignment))}
          </Text>
          {period ? (
            <Text style={[styles.periodText, { fontFamily: fonts.body, color: colors.inkSoft }]}>{period}</Text>
          ) : null}
        </View>
      </Pressable>
      {canCancel ? (
        <View style={styles.actions}>
          {busy ? (
            <ActivityIndicator color={colors.coral} />
          ) : confirming ? (
            <>
              <Pressable onPress={onConfirmCancel} hitSlop={8}>
                <Text style={[styles.declineLink, { fontFamily: fonts.bodySemiBold, color: colors.coral }]}>
                  Sure?
                </Text>
              </Pressable>
              <Pressable onPress={onCancelCancel} hitSlop={8}>
                <Text style={[styles.declineLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  Keep
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={onCancelPress} hitSlop={8}>
              <Text style={[styles.declineLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

// Read-only -- no status label, no actions, per spec: just who sat for
// you and when.
function HistoryRow({
  assignment,
  fonts,
}: {
  assignment: PlantSittingAssignment & { sitter: Profile };
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors } = useTheme();
  const period = formatSittingPeriod(assignment.starts_at, assignment.ends_at);
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.line }]}
      onPress={() => router.push(`/user/${assignment.sitter.id}`)}
    >
      <PhotoThumb uri={assignment.sitter.avatar_url} size={44} radius={radius.sm} />
      <View style={styles.rowText}>
        <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
          {assignment.sitter.display_name ?? `@${assignment.sitter.username}`}
        </Text>
        {period ? (
          <Text style={[styles.periodText, { fontFamily: fonts.body, color: colors.inkSoft }]}>{period}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PlantSittingScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<(PlantSittingAssignment & { owner: Profile })[]>([]);
  const [assignments, setAssignments] = useState<(PlantSittingAssignment & { owner: Profile })[]>([]);
  const [sentRequests, setSentRequests] = useState<(PlantSittingAssignment & { sitter: Profile })[]>([]);
  const [history, setHistory] = useState<(PlantSittingAssignment & { sitter: Profile })[]>([]);

  const [requestActionError, setRequestActionError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const busyRequestRef = useRef<string | null>(null);

  const [sentActionError, setSentActionError] = useState<string | null>(null);
  const [busySentId, setBusySentId] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const busySentRef = useRef<string | null>(null);

  const fetchAll = useCallback(() => {
    Promise.all([getMySittingRequests(), getMySittingAssignments(), getMySitters(), getSittersHistory()])
      .then(([requestsData, assignmentsData, sittersData, historyData]) => {
        setRequests(requestsData);
        setAssignments(assignmentsData);
        setSentRequests(sittersData);
        setHistory(historyData);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  async function handleAccept(id: string) {
    if (busyRequestRef.current) {
      return;
    }
    busyRequestRef.current = id;
    setBusyRequestId(id);
    setRequestActionError(null);

    try {
      await acceptSittingRequest(id);
      setRequests((prev) => prev.filter((assignment) => assignment.id !== id));
      fetchAll();
    } catch (err) {
      setRequestActionError(getErrorMessage(err));
    } finally {
      busyRequestRef.current = null;
      setBusyRequestId(null);
    }
  }

  async function handleDecline(id: string) {
    if (busyRequestRef.current) {
      return;
    }
    busyRequestRef.current = id;
    setBusyRequestId(id);
    setRequestActionError(null);

    try {
      await declineSittingRequest(id);
      setRequests((prev) => prev.filter((assignment) => assignment.id !== id));
    } catch (err) {
      setRequestActionError(getErrorMessage(err));
    } finally {
      busyRequestRef.current = null;
      setBusyRequestId(null);
    }
  }

  async function handleCancel(id: string) {
    if (busySentRef.current) {
      return;
    }
    busySentRef.current = id;
    setBusySentId(id);
    setConfirmingCancelId(null);
    setSentActionError(null);

    try {
      await cancelSittingRequest(id);
      setSentRequests((prev) => prev.filter((assignment) => assignment.id !== id));
      // Cancelling moves the assignment into history, so refetch that
      // section rather than just dropping it from "My sitters".
      fetchAll();
    } catch (err) {
      setSentActionError(getErrorMessage(err));
    } finally {
      busySentRef.current = null;
      setBusySentId(null);
    }
  }

  const screen = (
    <Stack.Screen
      options={{
        title: "Plant Sitting",
        headerRight: () => (
          <Pressable onPress={() => router.push("/select-sitter")} hitSlop={8} style={styles.requestButtonWrap}>
            <Text style={[styles.requestButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
              + Request
            </Text>
          </Pressable>
        ),
      }}
    />
  );

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.paper }]} contentContainerStyle={styles.content}>
      {screen}

      <Text style={[styles.sectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>Requests for me</Text>
      {requestActionError ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{requestActionError}</Text>
      ) : null}
      {requests.length === 0 ? (
        <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          No pending requests
        </Text>
      ) : (
        requests.map((assignment) => (
          <RequestRow
            key={assignment.id}
            assignment={assignment}
            fonts={fonts}
            busy={busyRequestId === assignment.id}
            onAccept={() => handleAccept(assignment.id)}
            onDecline={() => handleDecline(assignment.id)}
          />
        ))
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacing, { fontFamily: fonts.display, color: colors.ink }]}>
        Sitting for
      </Text>
      {assignments.length === 0 ? (
        <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          You're not sitting for anyone right now
        </Text>
      ) : (
        assignments.map((assignment) => <AssignmentRow key={assignment.id} assignment={assignment} fonts={fonts} />)
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacing, { fontFamily: fonts.display, color: colors.ink }]}>
        My sitters
      </Text>
      {sentActionError ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{sentActionError}</Text>
      ) : null}
      {sentRequests.length === 0 ? (
        <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          You haven't asked anyone to sit for you
        </Text>
      ) : (
        sentRequests.map((assignment) => (
          <SentRequestRow
            key={assignment.id}
            assignment={assignment}
            fonts={fonts}
            busy={busySentId === assignment.id}
            confirming={confirmingCancelId === assignment.id}
            onCancelPress={() => setConfirmingCancelId(assignment.id)}
            onConfirmCancel={() => handleCancel(assignment.id)}
            onCancelCancel={() => setConfirmingCancelId(null)}
          />
        ))
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacing, { fontFamily: fonts.display, color: colors.ink }]}>
        Plant sitters history
      </Text>
      {history.length === 0 ? (
        <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          No past plant-sitters yet
        </Text>
      ) : (
        history.map((assignment) => <HistoryRow key={assignment.id} assignment={assignment} fonts={fonts} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  requestButtonWrap: {
    marginRight: spacing.md,
  },
  requestButton: {
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionSpacing: {
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    flexShrink: 1,
  },
  stateText: {
    fontSize: 12.5,
    marginTop: 2,
  },
  periodText: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  acceptLink: {
    fontSize: 14,
  },
  declineLink: {
    fontSize: 14,
  },
});
