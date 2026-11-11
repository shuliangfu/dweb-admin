/** Same scoring as @dreamer/ui-view Password showStrength (weak <= 2, medium <= 4, else strong). */
export function passwordStrengthScore(s: string): number {
  let score = 0;
  if (s.length >= 6) score++;
  if (s.length >= 10) score++;
  if (/[0-9]/.test(s)) score++;
  if (/[a-zA-Z]/.test(s)) score++;
  if (/[^a-zA-Z0-9]/.test(s)) score++;
  return score;
}

export const WEAK_PASSWORD_MESSAGE =
  "密码强度太弱，请加长或同时使用字母、数字、符号";

export function isWeakPassword(s: string): boolean {
  return passwordStrengthScore(s) <= 2;
}
