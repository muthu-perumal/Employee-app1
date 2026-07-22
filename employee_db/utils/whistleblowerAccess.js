const DEFAULT_REVIEWERS = [
  "arun@ezofis.com",
  "muthu.perumal@ezofis.com",
];

export function getWhistleblowerReviewers() {
  const fromEnv = String(process.env.WHISTLEBLOWER_REVIEWER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const emails = fromEnv.length ? fromEnv : DEFAULT_REVIEWERS;
  return [...new Set(emails)];
}

export function isWhistleblowerReviewer(email) {
  if (!email) return false;
  return getWhistleblowerReviewers().includes(String(email).trim().toLowerCase());
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
