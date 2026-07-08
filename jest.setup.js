// lib/supabase/client.ts uses AsyncStorage as its auth session store.
// AsyncStorage's real native module isn't available under Jest, so every
// test that transitively imports client.ts needs this -- the package ships
// its own official mock for exactly this case.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
