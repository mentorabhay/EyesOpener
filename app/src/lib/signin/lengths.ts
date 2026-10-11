// Eyes Opener: How long a session lasts. Kept in a file with no imports, so the words on the sign-in page can quote the numbers.
/**
 * How long a session lasts. Kept in a file with no imports, so the words on the sign-in page can quote the numbers
 * without pulling server code into the browser. The rules that use them: session-rules.ts.
 */

/** A person stays signed in on a device for this many days. */
export const SESSION_DAYS = 30;
/** A person who can see more than their own family (staff, a counsellor, a sponsor's team) signs in again after this many hours. */
export const TRUSTED_HOURS = 12;
