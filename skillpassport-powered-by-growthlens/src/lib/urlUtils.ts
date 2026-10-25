/**
 * Sanitizes redirect destination URLs to prevent open redirects and ensure safe internal navigation.
 *
 * Rules:
 * - Must be a non-empty string.
 * - Must start with a single '/' (relative application path).
 * - Must NOT start with '//' (protocol-relative URL bypass).
 * - Must NOT contain backslashes ('\\') (Windows/URL parser bypass).
 * - Must NOT contain URL schemes or protocol prefixes (e.g., 'http:', 'https:', 'javascript:', 'data:').
 * - If redirectOnboardingToEvidence is true and destination is bare '/app/onboarding',
 *   transforms to '/app/evidence' so completed users are not sent to the bare onboarding route.
 */
export function sanitizeRedirectUrl(
  rawTarget: string | null | undefined,
  defaultPath: string = "/app/evidence",
  options?: {
    redirectOnboardingToEvidence?: boolean;
  }
): string {
  if (!rawTarget || typeof rawTarget !== "string") {
    return defaultPath;
  }

  const trimmed = rawTarget.trim();

  // Enforce relative path, prevent protocol-relative (//) and backslash (\) escapes
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return defaultPath;
  }

  // Reject URLs that contain colon before query or hash (e.g. "/javascript:...", "/data:...")
  const pathPart = trimmed.split(/[?#]/)[0];
  if (pathPart.includes(":")) {
    return defaultPath;
  }

  // Transform bare onboarding destination to workspace default if requested
  if (
    options?.redirectOnboardingToEvidence &&
    (trimmed === "/app/onboarding" || trimmed === "/app/onboarding/")
  ) {
    return defaultPath;
  }

  return trimmed;
}
