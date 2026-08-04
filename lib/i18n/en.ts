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
      dueToday: "due today",
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
    lookupErrorOverloaded: "The AI is in high demand right now. Please try again in a few minutes.",
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
        privacyLink: "Privacy Policy",
        middle: " and ",
        termsLink: "Terms of Use",
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
      screenTitle: "Privacy Policy & Terms",
      heading: "Privacy Policy & Terms of Use update",
      intro: "The privacy policy and/or terms of use have changed since you last accepted them — please review to continue.",
      submitButton: "Accept and continue",
      signOutLink: "Sign out",
    },
    firstTime: {
      screenTitle: "Welcome",
      heading: "Welcome to Greenie",
      intro: "One quick step before you head in: check that these look right, and agree to the privacy policy and terms of use.",
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
      privacyLink: "Privacy Policy",
      middle: " and ",
      termsLink: "Terms of Use",
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
    feedback: {
      sectionTitle: "Feedback",
      sectionIntro: "Found a bug or have an idea? Let us know.",
      link: "Send feedback",
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
      hintModal: {
        title: "Become a supporter",
        intro: "A donation unlocks a badge next to your name, based on your total lifetime support:",
        tierThreshold: "€{amount}+",
        usernameNote:
          "To get credit for it, add your @username to the name or message field at checkout — that's how we match your donation to your Greenie account.",
        continueButton: "Continue to Buy Me a Coffee",
      },
    },
    badges: {
      sectionTitle: "Badges",
      sectionIntro: "Tap a badge to show or hide it next to your name.",
      saveButton: "Save badge settings",
      savedText: "Badge settings saved",
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
    close: "Close",
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
  badges: {
    supporterTier: {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
      platinum: "Platinum",
    },
    betaTester: {
      label: "Beta tester",
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
  feedback: {
    screenTitle: "Send Feedback",
    typeLabel: "What's this about?",
    types: {
      suggestion: "Suggestion",
      bug: "Bug report",
      feedback: "Feedback",
      other: "Other",
    },
    descriptionLabel: "Description",
    descriptionPlaceholder: "Tell us what's on your mind. For a bug, include the steps to reproduce it if you can.",
    photosLabel: "Photos (optional)",
    addPhotoButton: "Add photo",
    photoLimitHint: "Up to {max} photos",
    removePhoto: "Remove photo",
    submitButton: "Submit",
    submitAnotherButton: "Submit another",
    doneButton: "Done",
    successMessage: "Thanks for your feedback!",
    rateLimitError: "Please wait a minute before submitting again.",
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
    careStreak: "{count}-day streak",
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
    streakHint:
      "Care tasks your sitter completes count toward their own care streak, not yours. Your streak pauses while they're covering for you, and if they miss something on your plants, they get a day's grace to catch up before it affects theirs.",
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
      sittingGraceDayWater: "Grace day granted: {plant}'s watering is extended by 1 day — complete it by tomorrow",
      sittingGraceDayFertilize: "Grace day granted: {plant}'s fertilizing is extended by 1 day — complete it by tomorrow",
      sittingGraceDayRepot: "Grace day granted: {plant}'s soil change is extended by 1 day — complete it by tomorrow",
      sittingGraceExpiredWater: "Grace day ended for {plant}'s watering — your streak reset",
      sittingGraceExpiredFertilize: "Grace day ended for {plant}'s fertilizing — your streak reset",
      sittingGraceExpiredRepot: "Grace day ended for {plant}'s soil change — your streak reset",
    },
    plantFallback: "your plant",
  },
  careStreakGraceModal: {
    title: "Grace day",
    messageWater: "You've been granted a grace day: {plant}'s watering task is extended by 1 day. Complete it by tomorrow, or your care streak will reset.",
    messageFertilize: "You've been granted a grace day: {plant}'s fertilizing task is extended by 1 day. Complete it by tomorrow, or your care streak will reset.",
    messageRepot: "You've been granted a grace day: {plant}'s soil-change task is extended by 1 day. Complete it by tomorrow, or your care streak will reset.",
    messageMultiple: "You've been granted a grace day: {count} overdue care tasks are extended by 1 day. Complete them by tomorrow, or your care streak will reset.",
    dismiss: "Got it",
  },
  profile: {
    screenTitle: "Profile",
    error: "Error: {error}",
    username: {
      cooldownHint: "You can change your username again on {date}",
    },
    careStreak: {
      sectionTitle: "Care streak",
      current: "{count}-day streak",
      currentZero: "Mark a care task done on time to start a streak",
      longest: "Best: {count} days",
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
  help: {
    screenTitle: "Help & Tutorial",
    prompt: {
      title: "Welcome to Greenie!",
      message: "Want a quick look at what you can do here?",
      takeTour: "Take the tour",
      maybeLater: "Maybe later",
    },
    sections: {
      gettingStarted: {
        heading: "Getting started",
        body:
          "Greenie has five tabs along the bottom: **People** to find and follow other plant owners, **Feed** " +
          "for progress reports from people you follow, **Plants** for your own plant collection, **Sitting** to " +
          "arrange plant-sitting, and **Alerts** for your notifications. Tap your avatar in the top-left corner " +
          "of any tab to open your profile.",
      },
      plantsAndCareTasks: {
        heading: "Plants & care tasks",
        body:
          "Add a plant from the **Plants** tab with the **+** button. Each plant can have watering, fertilizing, " +
          "and repotting tasks with their own schedules — mark a task done from the plant's page and it's " +
          "rescheduled automatically. Overdue tasks show a red pill; done-on-time ones turn green. Archive a " +
          "plant you're no longer actively tracking from its own page — this pauses its reminders without " +
          "deleting anything, and you can restore it later from **Archived Plants**.",
      },
      aiLookup: {
        heading: "AI plant lookup",
        body:
          "When adding a plant, take or choose a photo and tap **\"Look up with AI\"** — Greenie will try to " +
          "identify the plant and suggest its name, species, and care schedule. You can type a name first as a " +
          "hint, or do a text-only lookup if you'd rather not use a photo. If the AI is unsure, it'll show you a " +
          "few likely matches to choose from instead of guessing.",
      },
      progressAndPhotos: {
        heading: "Progress reports & photos",
        body:
          "Log a progress report from a plant's page to track how it's growing — add a height, a note, and a " +
          "photo if you like. Reports with a height build a growth chart over time. Choose whether a report is " +
          "**shared to your Feed** (visible to your followers) or kept **unlisted** (only reachable from the " +
          "plant's own page).",
      },
      notificationsAndStreaks: {
        heading: "Notifications & care streaks",
        body:
          "The **Alerts** tab collects everything: comments, likes, follow requests, and care-task reminders. " +
          "Enable push notifications in **Settings** to get them on your device too. Every day you complete all " +
          "of that day's due care tasks on time, your care streak goes up by one — miss one and it resets. If " +
          "you're plant-sitting for someone, a missed task on their plant gives you a one-day grace period " +
          "before it affects your own streak.",
      },
      social: {
        heading: "Social",
        body:
          "Follow other plant owners from **People** to see their public progress reports in your **Feed**. " +
          "Like and comment on any report you can see. If someone's account is private, you'll need to send a " +
          "follow request first. You can **block** an account (hides each other's content both ways) or " +
          "**report** a specific report, comment, or account that breaks the rules.",
      },
      plantSitting: {
        heading: "Plant-sitting",
        body:
          "Ask a mutual follower to look after your plants while you're away from the **Sitting** tab — once " +
          "they accept, they can see your care tasks, mark them done, and log progress reports on your behalf " +
          "for as long as the arrangement lasts. Tasks they complete count toward **their** care streak, not " +
          "yours — your own streak simply pauses while they're covering you. If they miss a task, they get a " +
          "one-day grace period before it affects their streak.",
      },
      supporterBadges: {
        heading: "Supporter badges",
        body:
          "Donating through **Buy Me a Coffee** (linked from Settings) earns you a supporter badge, with higher " +
          "tiers unlocked at higher totals — type your **@username** at checkout so it's matched to your " +
          "account automatically. There's also a separate beta-tester badge for early testers. Toggle which " +
          "badges show on your profile from **Settings**.",
      },
      privacyAndData: {
        heading: "Privacy & your data",
        body:
          "Control who can see your plants, progress reports, and follower list from **Settings → Privacy**. " +
          "From **Settings → Your data**, download everything Greenie stores about you, or have a copy emailed " +
          "to you. Deleting your account from **Settings → Danger zone** is immediate and permanent.",
      },
    },
  },
  privacyPolicy: {
    screenTitle: "Privacy Policy",
    // Keep in sync with app_config.privacy_policy_updated_at: a material
    // policy change (here or in pt-PT.ts) updates this line AND ships a
    // migration bumping that value, which re-prompts every user once
    // (see migration 0013's own comment for the full mechanism).
    lastUpdated: "Last updated: 1 August 2026",
    sections: {
      whatWeStore: {
        heading: "What Greenie stores",
        body:
          "Your account: email address, username, display name, bio, your privacy settings, notification " +
          "preferences, and (if you use push notifications) your device's push token. " +
          "Your plants: names, nicknames, species, locations, acquisition dates, and care schedules. " +
          "Your activity: progress reports, comments, likes, who you follow or who follows you, accounts " +
          "you've blocked, plant-sitting arrangements you're part of, your care-streak stats, notifications " +
          "about activity on your account, and any content reports you've filed. " +
          "Support & recognition: if you've supported Greenie's development, your lifetime donation total " +
          "and supporter badge tier; if you're a beta tester, that status; and your visibility preference " +
          "for each badge. " +
          "Photos: any photo you attach to your profile, a plant, or a progress report.",
      },
      whereItLives: {
        heading: "Where it lives",
        body:
          "All data, including uploaded photos, is stored in a Supabase project (Postgres database, " +
          "authentication, and file storage). Access is protected by row-level security: private content " +
          "is enforced by the database itself, not just hidden by the app.",
      },
      whatLeavesTheApp: {
        heading: "What leaves the app",
        body:
          "When you use the AI plant lookup while adding a plant, the plant name, description, or photo " +
          "you provide is sent to Google Gemini to identify the species and suggest a watering schedule. " +
          "No account data is attached to that request. " +
          "Account emails — sign-up confirmation, password reset, and account-deletion codes — are sent " +
          "through Resend, our email delivery provider. If you use Settings → Your data → Email me a copy, " +
          "your full data export is also sent through Resend as an email attachment to your own account " +
          "address. " +
          "If you have push notifications enabled, your device's push token and the content of a " +
          "notification (for example, a care-task reminder) pass through Expo's push notification service " +
          "to reach your device. " +
          "If you sign up or sign in with Google, Google shares your email address and name with Greenie " +
          "to create or match your account — nothing else. " +
          "If you support the project via Buy Me a Coffee and it can match your donation to your account " +
          "(by email or by mentioning your @username), Buy Me a Coffee sends us your email, name, message, " +
          "and donation amount so we can credit your account; if it can't be matched automatically, that " +
          "information is reviewed manually. " +
          "Beyond what's described in this section, nothing else is sent to or received from third parties.",
      },
      whatWeDontDo: {
        heading: "What Greenie doesn't do",
        body: "No advertising, no tracking, no analytics, no selling of data — none of that exists in this app.",
      },
      yourRights: {
        heading: "Your rights",
        body:
          "Rectification: edit your profile details on the Profile page at any time. " +
          "Portability: download everything Greenie stores about you as a JSON file from Settings → Your data, " +
          "or have a copy emailed to your account address instead. " +
          "Erasure: permanently delete your account and all of its data — including your plants, reports, " +
          "comments, likes, follows, and uploaded photos — from Settings → Danger zone. Deletion is " +
          "immediate and irreversible.",
      },
      consent: {
        heading: "Consent",
        body:
          "Creating an account requires agreeing to this policy; the time of your agreement is stored with " +
          "your profile. If this policy materially changes, you'll be asked to review it again.",
      },
    },
  },
  termsOfUse: {
    screenTitle: "Terms of Use",
    draftBanner: "Draft — requires review before public launch.",
    // Keep in sync with app_config.privacy_policy_updated_at, the same
    // trigger the Privacy Policy uses (see that namespace's own
    // comment) -- this document is re-consented to together with the
    // Privacy Policy, not on its own separate schedule.
    lastUpdated: "Last updated: 3 August 2026",
    sections: {
      acceptance: {
        heading: "Acceptance of these Terms",
        body:
          "By creating an account or using Greenie, you agree to these Terms of Use and to our Privacy " +
          "Policy. If you don't agree, please don't use the app.",
      },
      account: {
        heading: "Your account",
        body:
          "You must be at least 13 years old to use Greenie. You're responsible for the activity on your " +
          "account and for keeping your password secure. Usernames and profile content must not impersonate " +
          "another person or organization.",
      },
      userContent: {
        heading: "Your content and conduct",
        body:
          "You keep ownership of the plants, photos, progress reports, comments, and other content you post " +
          "(\"your content\"). By posting it, you give Greenie a limited license to store, display, and " +
          "share it within the app as intended by your own privacy settings — nothing more. " +
          "You agree not to post or share content that: is illegal, harassing, hateful, or threatening; is " +
          "sexually explicit, or in any way involves the exploitation or endangerment of a minor; " +
          "impersonates another person; infringes someone else's copyright, trademark, or other rights; is " +
          "spam, a scam, or malicious code; or otherwise violates these Terms.",
      },
      moderation: {
        heading: "Moderation and enforcement",
        body:
          "Greenie provides in-app tools to report content or accounts (Report) and to block other users " +
          "(Block). We may review reported content, remove content that violates these Terms, and suspend " +
          "or terminate accounts that repeatedly or seriously violate them, with or without notice.",
      },
      aiFeatures: {
        heading: "AI-assisted plant identification",
        body:
          "Greenie's photo-based plant lookup uses Google Gemini to suggest a plant's name, species, and " +
          "care schedule. These suggestions are informational and may be inaccurate or incomplete — they're " +
          "not a substitute for professional advice, and you shouldn't rely on them as the sole source of " +
          "information about a plant's safety, including toxicity to people or pets.",
      },
      thirdParty: {
        heading: "Third-party services",
        body:
          "Greenie relies on third-party services to operate — including Supabase for data storage, Google " +
          "Gemini for plant identification, Resend for email delivery, and Expo for push notifications. See " +
          "our Privacy Policy for details on what's shared with each.",
      },
      disclaimers: {
        heading: "Disclaimers and limitation of liability",
        body:
          "Greenie is provided \"as is,\" without warranties of any kind. We don't guarantee the app will " +
          "be uninterrupted or error-free, or that any content (including AI-generated suggestions) is " +
          "accurate. To the fullest extent permitted by law, Greenie and its developer aren't liable for " +
          "any indirect, incidental, or consequential damages arising from your use of the app, including " +
          "harm to a plant, pet, or person that relied on information provided in the app.",
      },
      termination: {
        heading: "Termination",
        body:
          "You may stop using Greenie and delete your account at any time from Settings → Danger zone. We " +
          "may suspend or terminate your access if you violate these Terms, misuse the service, or if we " +
          "discontinue the app.",
      },
      changes: {
        heading: "Changes to these Terms",
        body:
          "We may update these Terms from time to time. If a change is material, we'll ask you to review " +
          "and accept the updated Terms again the next time you use the app, the same way we handle privacy " +
          "policy updates.",
      },
      governingLaw: {
        heading: "Governing law",
        body:
          "These Terms are governed by the laws of Portugal and the European Union, without regard to " +
          "conflict-of-law principles. Any dispute arising from these Terms or your use of Greenie is " +
          "subject to the exclusive jurisdiction of the courts of Portugal.",
      },
      contact: {
        heading: "Contact",
        body:
          "Questions about these Terms? Reach out via the feedback option in Settings, or through the same " +
          "contact channel listed in our Privacy Policy.",
      },
    },
  },
};
