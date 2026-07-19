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
    },
    feed: {
      title: "Feed",
      peopleAction: "People",
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
    location: {
      label: "Location (optional)",
      placeholder: "e.g. Living room, east window",
    },
    acquiredDate: {
      label: "Acquired date (optional)",
    },
    initialHeight: {
      label: "Initial height (cm, optional)",
      placeholder: "e.g. 32",
    },
    saveButton: "Save plant",
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
};
