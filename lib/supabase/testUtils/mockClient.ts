// Shared test helper for mocking `./client`'s `supabase` export. Builds a
// fluent chainable query-builder mock (`.from().select().eq()...`, every
// intermediate call returning itself, the object itself thenable so it
// resolves the same way whether or not a test's code under test calls
// `.single()`/`.maybeSingle()` at the end) plus stub `auth`/`functions`
// namespaces. Each test configures return values per call rather than this
// file re-implementing Supabase's own behavior.

export type QueryResult<T = unknown> = { data: T; error: unknown };

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "eq",
  "neq",
  "in",
  "ilike",
  "or",
  "order",
  "limit",
] as const;

export function createChainableQueryMock<T = unknown>(result: QueryResult<T>) {
  const chain: Record<string, jest.Mock> & { then: Promise<QueryResult<T>>["then"] } = {} as never;

  for (const method of CHAIN_METHODS) {
    chain[method] = jest.fn(() => chain);
  }
  chain.single = jest.fn(() => Promise.resolve(result));
  chain.maybeSingle = jest.fn(() => Promise.resolve(result));
  chain.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected);

  return chain;
}

export function createMockSupabaseClient() {
  return {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  };
}
