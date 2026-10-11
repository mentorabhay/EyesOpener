// Eyes Opener: The rules of six-digit sign-in codes, apart from the database, so the sign-in form shows the same numbers. Pure. .
/** The rules of six-digit sign-in codes, apart from the database, so the sign-in form shows the same numbers. Pure. */
export const CODE_MINUTES = 10;
export const MAX_TRIES = 5;
export const CODE = /^\d{6}$/;

/** The code as typed: spaces and dashes dropped (people copy "123 456"). Null when it is not six digits. */
export const tidyCode = (raw: unknown): string | null => {
  const c = typeof raw === "string" ? raw.replace(/[\s-]/g, "") : "";
  return CODE.test(c) ? c : null;
};
