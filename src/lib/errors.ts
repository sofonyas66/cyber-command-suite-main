export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    
    // Supabase error format
    if (typeof error.message === "string") {
      let msg = error.message;
      if (typeof error.details === "string" && error.details) {
        msg += `: ${error.details}`;
      }
      if (typeof error.hint === "string" && error.hint) {
        msg += ` (Hint: ${error.hint})`;
      }
      return msg;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err);
}
