// Canonical English dictionary. Every namespace here is the source of
// truth pt-PT.ts is type-checked against -- a missing pt-PT key is a
// compile error, not a silent runtime fallback. Grows one namespace per
// PR as screens are converted (see the multi-language plan); namespaces
// are keyed to match the screen/feature they belong to.
export const en = {
  tabsLayout: {
    plants: {
      title: "Plants",
      addAction: "Add",
      archivedAction: "Archived",
    },
    feed: {
      title: "Feed",
    },
    people: {
      title: "People",
    },
    plantSitting: {
      title: "Plant Sitting",
      tabLabel: "Sitting",
    },
    notifications: {
      title: "Alerts",
    },
  },
  index: {
    status: {
      overdue: "overdue",
      dueSoon: "due soon",
      healthy: "healthy",
    },
    careType: {
      watering: "watering",
      fertilize: "fertilize",
      repot: "repot",
    },
    pill: {
      labelStatus: "{label}: {status}",
    },
    error: "Error: {error}",
    emptyState: "No plants yet",
    logProgress: "Log progress",
  },
  feed: {
    plantLine: {
      sentence: "Logged progress on {owner}'s {plant}",
      sentenceNoOwner: "Logged progress on {plant}",
    },
    heightUnit: "{height} cm",
    like: {
      liked: "♥ Liked",
      unliked: "♡ Like",
    },
    comments: {
      off: "Comments off",
      countOne: "{count} comment",
      countMany: "{count} comments",
      none: "No comments yet",
      add: "Add comment",
    },
    error: "Error: {error}",
    emptyState: "No activity yet",
  },
  addPlant: {
    screenTitle: "Add Plant",
    photo: {
      label: "Photo",
      lookupButton: "Look up with AI",
    },
    name: {
      label: "Name (optional)",
      placeholder: "e.g. Pothos — leave blank to let AI name it from the photo",
    },
    nickname: {
      label: "Nickname (optional)",
    },
    species: {
      label: "Species",
      placeholder: "e.g. Epipremnum aureum",
    },
    wateringFrequency: {
      label: "Watering frequency (days)",
      placeholder: "e.g. 8",
    },
    fertilizeFrequency: {
      label: "Fertilize frequency (days, optional)",
      placeholder: "e.g. 30",
    },
    repotFrequency: {
      label: "Repot frequency (days, optional)",
      placeholder: "e.g. 365",
    },
    location: {
      label: "Location (optional)",
      placeholder: "e.g. Living room, east window",
    },
    lightExposure: {
      label: "Light exposure (optional)",
      options: {
        lowLight: "Low light",
        mediumLight: "Medium light",
        brightIndirect: "Bright indirect",
        directSun: "Direct sun",
      },
    },
    careDifficulty: {
      label: "Care difficulty (optional)",
      options: {
        beginner: "Beginner",
        intermediate: "Intermediate",
        advanced: "Advanced",
      },
    },
    toxicToPets: {
      label: "Toxic to pets? (optional)",
    },
    toxicToHumans: {
      label: "Toxic to humans? (optional)",
    },
    toxicity: {
      options: {
        yes: "Yes",
        no: "No",
        unknown: "Unknown",
      },
    },
    acquiredDate: {
      label: "Acquired date (optional)",
    },
    initialHeight: {
      label: "Initial height (cm, optional)",
      placeholder: "e.g. 32",
    },
    saveButton: "Save plant",
    lookupError: "Couldn't look up this plant. Please try again.",
    lookupModal: {
      nameMismatch: {
        message: 'AI identified this as "{aiName}", but you entered "{typedName}".',
        keepTyped: 'Keep "{typedName}"',
        useAi: 'Use "{aiName}"',
      },
      ambiguous: {
        message: "Found more than one possible match:",
      },
      notFound: {
        message:
          "Couldn't identify a plant in that photo. Take a new picture, or close this, type a common name above, and try again.",
      },
      takeNewPicture: "Take a new picture",
      cancel: "Cancel",
    },
  },
  signIn: {
    screenTitle: "Sign In",
    appTitle: "Greenie",
    email: {
      label: "Email",
      placeholder: "you@example.com",
    },
    password: {
      label: "Password",
      placeholder: "••••••••",
    },
    submitButton: "Sign in",
    divider: "or",
    googleButton: "Continue with Google",
    createAccountLink: "Create account",
  },
  signUp: {
    usernameTakenError: "Username is already taken",
    checkEmail: {
      screenTitle: "Create Account",
      message: "We sent a confirmation code to {email}. Enter it below to finish creating your account.",
      confirmButton: "Confirm",
      backToSignInLink: "Back to sign in",
    },
    form: {
      screenTitle: "Create Account",
      heading: "Create account",
      email: {
        label: "Email",
        placeholder: "you@example.com",
      },
      username: {
        label: "Username",
        placeholder: "e.g. plant.parent_42",
      },
      password: {
        label: "Password (min. 6 characters)",
        placeholder: "••••••••",
      },
      consent: {
        prefix: "I have read and agree to the ",
        link: "Privacy Policy",
      },
      submitButton: "Create account",
      divider: "or",
      googleButton: "Continue with Google",
      signInLink: "Already have an account? Sign in",
    },
  },
  welcome: {
    loadingScreenTitle: "Welcome",
    errorScreenTitle: "Welcome",
    error: "Error: {error}",
    reconsent: {
      screenTitle: "Privacy Policy",
      heading: "Privacy Policy update",
      intro: "The privacy policy has changed since you last accepted it — please review it to continue.",
      submitButton: "Accept and continue",
      signOutLink: "Sign out",
    },
    firstTime: {
      screenTitle: "Welcome",
      heading: "Welcome to Greenie",
      intro: "One quick step before you head in: check that these look right, and agree to the privacy policy.",
      displayName: {
        label: "Display name",
        placeholder: "e.g. Carlos",
      },
      username: {
        label: "Username",
        placeholder: "e.g. plant.parent_42",
        cooldownHint: "This first change is free; afterwards usernames can only be changed once in a while.",
      },
      submitButton: "Continue",
      signOutLink: "Not you? Sign out",
    },
    consent: {
      prefix: "I have read and agree to the ",
      link: "Privacy Policy",
    },
  },
  settings: {
    screenTitle: "Settings",
    appearance: {
      sectionTitle: "Appearance",
      options: {
        system: "System",
        light: "Light",
        dark: "Dark",
      },
      hint: "System matches your device's setting.",
    },
    language: {
      sectionTitle: "Language",
      options: {
        system: "System",
        en: "English",
        ptPT: "Português (Portugal)",
      },
      hint: "System matches your device's language.",
    },
    changePassword: {
      sectionTitle: "Change password",
      googleOnlyHint: "You sign in with Google — this account has no password.",
      currentPassword: { label: "Current password" },
      newPassword: { label: "New password (min. 6 characters)" },
      confirmPassword: {
        label: "Confirm new password",
        mismatchError: "Passwords don't match",
      },
      savedText: "Password updated",
      saveButton: "Save",
    },
    emailLinkedAccounts: {
      sectionTitle: "Email & linked accounts",
      googleSyncBanner:
        "Google account linked — check {email} for a confirmation link to finish switching your account email.",
      currentEmail: "Current email: {email}",
      newEmail: {
        label: "New email",
        placeholder: "you@example.com",
      },
      codeSent: "Code sent to {email}",
      confirmationCode: { label: "Confirmation code" },
      emailChanged: "Check {newEmail} for a confirmation link to finish the change.",
      confirmChangeButton: "Confirm & change email",
      sendCodeButton: "Send code to current email",
      linkedAccounts: {
        label: "Linked accounts",
        googleLinked: "Google account linked ({email}).",
        webOnlyHint: "Linking a Google account is available on the web for now.",
        confirmLinkButton: "Confirm & link Google account",
        unlinkButton: "Unlink",
        confirmUnlink: {
          message: "Unlink your Google account ({email})? You can link it again anytime.",
          confirmButton: "Unlink",
        },
      },
    },
    privacy: {
      sectionTitle: "Privacy",
      readPolicyLink: "Read the Privacy Policy",
      blockedUsersLink: "Blocked users",
      profileVisibility: {
        label: "Profile",
        options: { public: "Public", private: "Private" },
        hint: "Private shows only your name, avatar, and bio to people who don't follow you.",
      },
      followRequests: {
        label: "Follow requests",
        options: { open: "Anyone can follow", request: "Require approval" },
      },
      progressReports: {
        label: "Progress reports",
        options: { public: "Public", private: "Followers only" },
      },
      plantSitters: {
        label: "Plant-sitters",
        options: {
          allowed: "Allow sharing to their feed",
          disabled: "Keep in plant history only",
        },
        hint:
          "When a plant-sitter logs a progress report on one of your plants, this controls whether they can share it to their own feed. Off: their reports stay in this plant's own history only.",
      },
      savedText: "Privacy settings saved",
      saveButton: "Save privacy settings",
    },
    notifications: {
      sectionTitle: "Notifications",
      push: {
        label: "Push notifications",
        webHint: "Push notifications are available in the mobile app.",
        options: { on: "On", off: "Off" },
        hint:
          "Get notifications on this device. Applies to this device only — turning it off doesn't touch your in-app inbox.",
        permissionDeniedError:
          "Notification permission was denied — allow notifications for Greenie in your device settings, then try again.",
      },
      sectionIntro: "Choose what shows up in your notifications. Anything turned off is never created — not just hidden.",
      prefRows: {
        careTaskReminders: "Care task reminders",
        comments: "Comments",
        likes: "Likes",
        followRequests: "Follow requests",
        newFollowers: "New followers",
        followRequestAccepted: "Follow request accepted",
        sittingRequests: "Plant-sitting requests",
        sittingResponses: "Plant-sitting responses",
      },
      prefOptions: { on: "On", off: "Off" },
      savedText: "Notification settings saved",
      saveButton: "Save notification settings",
    },
    support: {
      sectionTitle: "Support Greenie",
      sectionIntro:
        "If Greenie's useful to you, you can buy me a coffee — totally optional, just a way to say thanks.",
      button: "Buy me a coffee",
    },
    yourData: {
      sectionTitle: "Your data",
      sectionIntro:
        "Everything Greenie stores about you — your account, plants, care schedules, progress reports, comments, likes, and follows — as a JSON file. Download it to this device, or have a copy emailed to your account address instead.",
      downloadButton: "Download my data",
      emailSent: "Sent — check {email}.",
      emailButton: "Email me a copy",
    },
    dangerZone: {
      sectionTitle: "Danger zone",
    },
  },
  common: {
    cancel: "Cancel",
    save: "Save",
    notSet: "Not set",
    heightUnit: "{height} cm",
    confirmSure: "Sure?",
    accept: "Accept",
    decline: "Decline",
    unblock: "Unblock",
    report: "Report",
    chipOptions: {
      commentPolicy: {
        anyone: "Anyone",
        followersOnly: "Followers only",
        off: "Off",
      },
      feedSharing: {
        shareToFeed: "Share to feed",
        dontShare: "Don't share",
      },
    },
  },
  plantDetail: {
    headerTitle: "Plant",
    errorPrefix: "Error: {error}",
    neverDoneDate: "Never",
    nickname: {
      label: "Nickname",
      editLink: "Edit",
    },
    acquiredDate: {
      label: "Acquired date",
      editLink: "Edit",
    },
    archived: {
      badge: "Archived",
      archiveLink: "Archive this plant",
      confirmMessage:
        "Archive this plant? It'll be hidden from your Plants list and its care reminders will pause. You can restore it anytime from Archived Plants.",
    },
    lightExposure: {
      low_light: "Low light",
      medium_light: "Medium light",
      bright_indirect: "Bright indirect light",
      direct_sun: "Direct sun",
    },
    careDifficulty: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
    toxicity: {
      toxicToPets: "Toxic to pets",
      safeForPets: "Safe for pets",
      toxicToHumans: "Toxic to humans",
      safeForHumans: "Safe for humans",
    },
    progress: {
      label: "Progress",
      empty: "No progress logged yet",
      unlistedTag: "Unlisted",
    },
    careTasks: {
      label: "Care tasks",
      frequencyOne: "Every {count} day",
      frequencyMany: "Every {count} days",
      lastDone: "Last done: {date}",
      nextDue: "Next due: {date}",
      frequencyPlaceholder: "days",
      deleteConfirmPrompt: "Delete this task?",
      confirm: "Confirm",
      overduePrompt: "This task is overdue. Count the next due date from:",
      originalDueDate: "Original due date",
      today: "Today",
      markDone: "Mark done",
      edit: "Edit",
      delete: "Delete",
      addTask: "+ Add task",
    },
  },
  progress: {
    headerTitle: "Progress",
    errorPrefix: "Error: {error}",
    setAsPlantPhoto: "Set as plant's photo",
    ownerSettings: {
      commentsLabel: "Comments",
      feedLabel: "Feed",
      sitterShareBlockedHint:
        "This plant's owner keeps sitter reports out of feeds — this stays in the plant's own history only.",
      unlistedLockHint: "This report is unlisted and can't be shared again; comments stay off.",
    },
    commentsOffNotice: "Comments are off on this post",
    commentInputPlaceholder: "Add a comment",
    postButton: "Post",
    followersOnlyNotice: "Only followers can comment on this",
  },
  logProgress: {
    headerTitle: "Log Progress",
    photo: {
      label: "Photo (optional)",
      chipJustReport: "Just this report",
      chipAlsoSetPlantPhoto: "Also set as plant's photo",
    },
    height: {
      label: "Height (cm, optional)",
    },
    notes: {
      label: "Notes",
      placeholder: "What's new with this plant?",
    },
    comments: {
      label: "Comments",
    },
    feed: {
      label: "Feed",
      unlistedWarning:
        "Won't appear in anyone's feed, and comments will be off — this can't be undone once saved.",
      sitterShareBlockedHint:
        "This plant's owner keeps sitter reports out of feeds — this will only appear in the plant's own history.",
    },
  },
  likes: {
    fallbackName: "Someone",
    headerTitle: "Liked by",
    empty: "No likes yet",
    errorPrefix: "Error: {error}",
  },
  report: {
    screenTitle: "Report",
    reasonLabel: "Why are you reporting this?",
    reasons: {
      spam: "Spam",
      harassment: "Harassment or bullying",
      inappropriate_content: "Inappropriate content",
      other: "Other",
    },
    detailsLabel: "Additional details (optional)",
    detailsPlaceholder: "Anything else we should know?",
    alsoBlock: "Also block this account",
    submitButton: "Submit report",
    successMessage: "Thanks — we'll review this report.",
    blockFailed: "Report submitted, but we couldn't block this account: {error}",
    doneButton: "Done",
  },
  heightChart: {
    captionEntry: "{date} · {height} cm",
  },
  datePickerField: {
    defaultPlaceholder: "Select date",
    backToCalendar: "‹ Back to calendar",
    clearDate: "Clear date",
    monthNames: {
      january: "January",
      february: "February",
      march: "March",
      april: "April",
      may: "May",
      june: "June",
      july: "July",
      august: "August",
      september: "September",
      october: "October",
      november: "November",
      december: "December",
    },
    monthAbbrev: {
      jan: "Jan",
      feb: "Feb",
      mar: "Mar",
      apr: "Apr",
      may: "May",
      jun: "Jun",
      jul: "Jul",
      aug: "Aug",
      sep: "Sep",
      oct: "Oct",
      nov: "Nov",
      dec: "Dec",
    },
  },
  photoPicker: {
    takePhoto: "Take Photo",
    chooseFromLibrary: "Choose from Library",
  },
  following: {
    screenTitle: "Following",
    headerActions: {
      requests: "Requests",
      followers: "Followers",
      add: "Add",
    },
    error: "Error: {error}",
    emptyState: "Not following anyone yet",
    noMatch: 'No one you follow matches "{query}"',
    searchPlaceholder: "people you follow",
  },
  followers: {
    screenTitle: "Followers",
    error: "Error: {error}",
    emptyState: "No followers yet",
    row: {
      remove: "Remove",
    },
    confirmRemove: {
      message: "Remove {name} as a follower?",
    },
  },
  followRequests: {
    screenTitle: "Follow Requests",
    error: "Error: {error}",
    emptyState: "No pending requests",
  },
  searchUsers: {
    screenTitle: "Search Users",
    placeholder: "users by name or username",
    error: "Error: {error}",
    promptState: "Type a name or username to search",
    emptyState: "No users found",
    addButton: {
      add: "Add",
      following: "Following",
    },
  },
  blockedUsers: {
    screenTitle: "Blocked Users",
    error: "Error: {error}",
    emptyState: "No blocked users",
  },
  archivedPlants: {
    screenTitle: "Archived Plants",
    error: "Error: {error}",
    emptyState: "No archived plants",
    row: {
      restore: "Restore",
      delete: "Delete",
    },
    confirmDelete: {
      message: "Permanently delete {name}? This can't be undone.",
    },
  },
  userProfile: {
    loadingTitle: "Profile",
    error: "Error: {error}",
    noBio: "No bio yet",
    blockedNotice: "You've blocked this account.",
    followButton: {
      follow: "Follow",
      requested: "Requested",
      unfollow: "Unfollow",
    },
    confirmBlock: {
      message:
        "Block this account? They won't be able to follow you or see your plants and progress reports, and you won't see theirs. You can unblock anytime.",
      confirm: "Block",
    },
    blockLink: "Block this account",
    plantsSection: {
      privateNotice: "This account is private",
    },
  },
  plantSitting: {
    state: {
      pending: "Pending",
      upcoming: "Upcoming",
      active: "Active",
      ended: "Ended",
      declined: "Declined",
      cancelled: "Cancelled",
    },
    header: {
      share: "Share",
      request: "Request",
    },
    shareDialogTitle: "Plant care instructions",
    shareError: {
      noPlants: "You have no plants to share care instructions for yet.",
    },
    error: "Error: {error}",
    sectionTitle: {
      requestsForMe: "Requests for me",
      sittingFor: "Sitting for",
      mySitters: "My sitters",
      history: "Plant sitters history",
    },
    emptyState: {
      noRequests: "No pending requests",
      notSittingForAnyone: "You're not sitting for anyone right now",
      noSitters: "You haven't asked anyone to sit for you",
      noHistory: "No past plant-sitters yet",
    },
    sentRequestRow: {
      keep: "Keep",
    },
    confirmCancelRequest: {
      message: "Cancel your plant-sitting request to {name}?",
    },
  },
  requestSitting: {
    screenTitle: "Request Plant-Sitting",
    sitterFallback: "this follower",
    intro:
      "Ask {sitterName} to look after all of your plants while you're away. They'll be able to view your care tasks, mark them done, and log new progress reports on your behalf.",
    startDate: {
      label: "Start date (optional)",
    },
    endDate: {
      label: "End date (optional)",
      rangeError: "End date must be on or after the start date",
      hint:
        "Leave both blank for an open-ended request you can cancel anytime. Access opens at the start date and closes after the end date -- accepting early doesn't open it sooner.",
    },
    sendButton: "Send request",
  },
  selectSitter: {
    screenTitle: "Choose a Sitter",
    error: "Error: {error}",
    emptyState: "You don't have any mutual followers yet -- plant-sitting requires you to follow each other.",
  },
  notificationsScreen: {
    error: "Error: {error}",
    emptyState: "Nothing here yet",
    sentence: {
      comment: "{name} commented on your report",
      like: "{name} liked your report",
      followRequest: "{name} requested to follow you",
      newFollower: "{name} started following you",
      followAccepted: "{name} accepted your follow request",
      sittingRequest: "{name} asked you to plant-sit",
      sittingAccepted: "{name} accepted your plant-sitting request",
      sittingDeclined: "{name} declined your plant-sitting request",
      careDueWater: "Time to water {plant}",
      careDueFertilize: "Time to fertilize {plant}",
      careDueRepot: "Time to repot {plant}",
    },
    plantFallback: "your plant",
  },
  profile: {
    screenTitle: "Profile",
    error: "Error: {error}",
    username: {
      cooldownHint: "You can change your username again on {date}",
    },
    bio: {
      label: "Bio",
      placeholder: "Tell other plant people about yourself",
    },
    savedText: "Saved",
    confirmUsernameChange: {
      message: "Usernames can only be changed once every {days} days. Change it to @{username}?",
      confirm: "Change username",
    },
    signOutButton: "Sign out",
  },
  deleteAccount: {
    screenTitle: "Delete Account",
    heading: "Delete your account",
    intro:
      "This page lets you permanently delete your Greenie account and all of its data without needing the app installed. Sign in to continue — deletion still requires confirming a code sent to your account's email, the same as deleting from within the app.",
    deletedMessage:
      "Your account has been deleted. Everything associated with it — your profile, plants, care schedules, progress reports, comments, likes, and follows — has been permanently removed.",
  },
  accountDeletionFlow: {
    sectionIntro: {
      base:
        "Deleting your account permanently removes your profile, plants, care schedules, progress reports, comments, likes, and follows. This cannot be undone.",
      passwordless: "To confirm it's really you, type your username and enter a confirmation code sent to your email.",
      withPassword: "To confirm it's really you, enter your password and a confirmation code sent to your email.",
    },
    usernameConfirm: {
      label: "Type @{username} to confirm",
      fallbackUsername: "your username",
      placeholderFallback: "@username",
    },
    fallbackEmail: "your email",
    codePlaceholder: "123456",
    sendCodeButton: "Email me a confirmation code",
    confirmDelete: {
      message: "Last chance — this permanently erases your account and everything in it.",
      confirm: "Delete everything",
    },
    deleteButton: "Permanently delete my account",
  },
};
