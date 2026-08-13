/**
 * App-wide constants.
 */

/**
 * The single locale the app speaks: British English.
 *
 * Used for the document `lang`, the web manifest, and any `toLocale*` call, so
 * dates and interface copy don't drift to the visitor's browser locale. The
 * model is told the same thing in `lib/prompt.ts`.
 */
export const LOCALE = "en-GB";

/**
 * Maximum length of a single analysis request, in characters.
 *
 * Enforced in two places that must agree: the client disables submission past
 * it (`AnalyzeForm`), and `/api/analyze` rejects anything longer.
 */
export const MAX_CHARS = 1500;
