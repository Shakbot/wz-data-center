const CORE_ROLES = new Set(["总教练", "常务副总教练", "特级运动员", "一般运动员"]);
const CLUB_ROLES = new Set([...CORE_ROLES, "特邀运动员", "观察员"]);

export function trainingDefinition(state) {
  const saved = state?.trainingDefinition || {};
  const number = (value, fallback) => value != null && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 10
    ? Number(value) : fallback;
  return {
    id: String(saved.id || "default-b-3"),
    totalMin: number(saved.totalMin, 3),
    mode: saved.mode === "A" ? "A" : "B",
    groupMin: number(saved.groupMin, 3),
  };
}

export function isTrainingCandidate(state, memberCodes) {
  const rule = trainingDefinition(state);
  const members = [...new Set(memberCodes || [])]
    .map((code) => (state.users || []).find((user) => user.identityCode === code))
    .filter(Boolean);
  const clubCount = members.filter((user) => CLUB_ROLES.has(user.role)).length;
  const groupCount = members.filter((user) => CORE_ROLES.has(user.role) || (rule.mode === "B" && user.role === "特邀运动员")).length;
  return clubCount >= rule.totalMin && groupCount >= rule.groupMin;
}

export function candidateForExistingMatch(state, match, memberCodes) {
  return match.trainingDefinitionId === trainingDefinition(state).id
    ? isTrainingCandidate(state, memberCodes)
    : Boolean(match.isTrainingCandidate);
}
