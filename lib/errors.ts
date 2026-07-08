/**
 * Extracts a readable message from a caught value. Handles both native
 * `Error` instances and Supabase's `PostgrestError` shape, which carries a
 * `.message` string but is a plain object, not an `Error` instance — so
 * `err instanceof Error` is false for it and a bare `String(err)` fallback
 * would produce "[object Object]" instead of the actual error text.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return String(err);
}
