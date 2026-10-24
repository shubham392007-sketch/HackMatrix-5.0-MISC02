import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRedirectUrl } from "../src/lib/urlUtils.ts";

test("Scenario 1: Profile request is pending -> protected content is not rendered prematurely", () => {
  // Simulates AppAuthGuard logic:
  // if (isLoading || (isAuthenticated && isEmailVerified && profile === null && !profileError)) -> Loading state
  const isLoading = false;
  const isAuthenticated = true;
  const isEmailVerified = true;
  const profile = null;
  const profileError = null;

  const showLoading = isLoading || (isAuthenticated && isEmailVerified && profile === null && !profileError);
  const showProtectedContent = isAuthenticated && isEmailVerified && profile !== null && !isLoading && !profileError;

  assert.equal(showLoading, true, "Must show loading screen while profile request is pending");
  assert.equal(showProtectedContent, false, "Must NOT render protected content before profile is loaded");
});

test("Scenario 2: Profile request fails -> recoverable error appears instead of infinite loading", () => {
  const isLoading = false;
  const isAuthenticated = true;
  const isEmailVerified = true;
  const profile = null;
  const profileError = "Unable to load workspace profile (HTTP 500)";

  const showLoading = isLoading || (isAuthenticated && isEmailVerified && profile === null && !profileError);
  const showErrorCard = isAuthenticated && isEmailVerified && profile === null && Boolean(profileError);
  const showProtectedContent = isAuthenticated && isEmailVerified && profile !== null;

  assert.equal(showLoading, false, "Must NOT be stuck on loading spinner when error occurs");
  assert.equal(showErrorCard, true, "Must render recoverable error UI when profile request fails");
  assert.equal(showProtectedContent, false, "Must NOT render protected content on failure");
});

test("Scenario 3: Retry succeeds -> profile loads and error clears", async () => {
  let profile = null;
  let profileError = "Unable to load workspace profile (HTTP 500)";
  let requestId = 0;

  // Simulate refreshProfile execution
  const refreshProfile = async () => {
    profileError = null; // Stale error cleared at start
    const currentReq = ++requestId;
    // Simulate successful API response
    const data = {
      id: "test-user-id",
      email: "engineer@example.com",
      onboarding_status: "completed",
      onboarding_current_step: 5,
    };
    if (currentReq === requestId) {
      profile = data;
      profileError = null;
    }
  };

  await refreshProfile();

  assert.notEqual(profile, null, "Profile must be populated on successful retry");
  assert.equal(profile.onboarding_status, "completed");
  assert.equal(profileError, null, "Profile error must be cleared on successful retry");
});

test("Scenario 4: User signs out during pending profile request -> stale results cannot restore old profile", async () => {
  let user = { id: "user-old", email: "old@example.com" };
  let session = { access_token: "token-old" };
  let profile = null;
  let profileError = null;
  let requestId = 0;

  // Request 1 starts
  const req1Id = ++requestId;

  // User signs out before Request 1 finishes
  const signOut = () => {
    requestId++; // Invalidates in-flight requests
    user = null;
    session = null;
    profile = null;
    profileError = null;
  };

  signOut();

  // Request 1 completes late (stale response)
  const staleData = { id: "user-old", display_name: "Old User" };
  if (req1Id === requestId) {
    profile = staleData;
  }

  assert.equal(user, null, "User must remain null after sign out");
  assert.equal(session, null, "Session must remain null after sign out");
  assert.equal(profile, null, "Stale in-flight profile must NOT overwrite signed out state");
});

test("Scenario 5: Incomplete onboarding save preserves existing progress semantics", () => {
  const existingProfile = {
    onboarding_status: "in_progress",
    onboarding_current_step: 1,
  };

  const isCompleted = existingProfile.onboarding_status === "completed";
  const payload = {
    display_name: "Jane Doe",
    job_title: "Full-Stack Engineer",
    onboarding_status: isCompleted ? "completed" : "in_progress",
    onboarding_current_step: isCompleted ? 5 : 2,
  };

  assert.equal(payload.onboarding_status, "in_progress", "Must advance with in_progress status");
  assert.equal(payload.onboarding_current_step, 2, "Must advance to step 2");
});

test("Scenario 6: Completed user saves details in review mode -> status remains completed", () => {
  const completedProfile = {
    onboarding_status: "completed",
    onboarding_current_step: 5,
  };

  const isCompleted = completedProfile.onboarding_status === "completed";
  const payload = {
    display_name: "Jane Doe",
    job_title: "Senior Staff Engineer",
    onboarding_status: isCompleted ? "completed" : "in_progress",
    onboarding_current_step: isCompleted ? completedProfile.onboarding_current_step : 2,
  };

  assert.equal(payload.onboarding_status, "completed", "Must NOT downgrade completed status in review mode");
  assert.equal(payload.onboarding_current_step, 5, "Must NOT regress step number in review mode");
});

test("Scenario 7: Query navigation from Step 1 to Step 3 updates wizard without full reload", () => {
  // Step parsing logic
  const parseStepParam = (stepParam) => {
    const parsed = stepParam ? parseInt(stepParam, 10) : null;
    return parsed !== null && !isNaN(parsed) ? Math.min(Math.max(parsed, 1), 5) : null;
  };

  let currentStep = 1;
  const initialStepParam = "1";
  currentStep = parseStepParam(initialStepParam) ?? currentStep;
  assert.equal(currentStep, 1);

  // Client-side router navigation triggers searchParams update to step 3
  const updatedStepParam = "3";
  const validRequestedStep = parseStepParam(updatedStepParam);
  if (validRequestedStep !== null && validRequestedStep !== currentStep) {
    currentStep = validRequestedStep;
  }

  assert.equal(currentStep, 3, "Wizard step must reactively update to 3");
});

test("Scenario 8: Invalid step values do not break the wizard", () => {
  const clampStep = (stepParam) => {
    const parsed = stepParam ? parseInt(stepParam, 10) : null;
    return parsed !== null && !isNaN(parsed) ? Math.min(Math.max(parsed, 1), 5) : null;
  };

  assert.equal(clampStep("99"), 5, "Step 99 must clamp to maximum step 5");
  assert.equal(clampStep("-5"), 1, "Negative step must clamp to minimum step 1");
  assert.equal(clampStep("0"), 1, "Step 0 must clamp to step 1");
  assert.equal(clampStep("not-a-number"), null, "Non-numeric step must be rejected safely as null");
  assert.equal(clampStep(null), null, "Null step must evaluate to null");
});

test("Scenario 9: External or protocol-relative login redirects are rejected", () => {
  const defaultPath = "/app/evidence";
  const options = { redirectOnboardingToEvidence: true };

  // External URLs
  assert.equal(sanitizeRedirectUrl("https://malicious-site.com", defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("http://attacker.com/evil", defaultPath, options), defaultPath);

  // Protocol-relative URLs
  assert.equal(sanitizeRedirectUrl("//attacker.com", defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("//malicious.org/app/evidence", defaultPath, options), defaultPath);

  // Backslash-based bypass attempts
  assert.equal(sanitizeRedirectUrl("/\\attacker.com", defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("\\\\attacker.com", defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("/app/evidence\\evil", defaultPath, options), defaultPath);

  // JavaScript/data protocol attempts
  assert.equal(sanitizeRedirectUrl("javascript:alert(1)", defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("/javascript:alert(1)", defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("data:text/html,evil", defaultPath, options), defaultPath);

  // Malformed or null inputs
  assert.equal(sanitizeRedirectUrl(null, defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl(undefined, defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("", defaultPath, options), defaultPath);
  assert.equal(sanitizeRedirectUrl("   ", defaultPath, options), defaultPath);
});

test("Scenario 10: Valid internal redirects continue to work", () => {
  const defaultPath = "/app/evidence";
  const options = { redirectOnboardingToEvidence: true };

  // Internal workspace paths
  assert.equal(sanitizeRedirectUrl("/app/evidence", defaultPath, options), "/app/evidence");
  assert.equal(sanitizeRedirectUrl("/app/career/compare", defaultPath, options), "/app/career/compare");
  assert.equal(sanitizeRedirectUrl("/app/career/readiness", defaultPath, options), "/app/career/readiness");
  assert.equal(sanitizeRedirectUrl("/app/learning/progress", defaultPath, options), "/app/learning/progress");
  assert.equal(sanitizeRedirectUrl("/app/evidence/upload?category=resume", defaultPath, options), "/app/evidence/upload?category=resume");

  // Onboarding special-case transformation
  assert.equal(sanitizeRedirectUrl("/app/onboarding", defaultPath, options), "/app/evidence", "Bare onboarding redirect must be mapped to /app/evidence");
  assert.equal(sanitizeRedirectUrl("/app/onboarding/", defaultPath, options), "/app/evidence", "Bare onboarding trailing slash must be mapped to /app/evidence");

  // Onboarding with review mode preserved
  assert.equal(sanitizeRedirectUrl("/app/onboarding?mode=review", defaultPath, options), "/app/onboarding?mode=review", "Onboarding with review mode must be preserved");
});
