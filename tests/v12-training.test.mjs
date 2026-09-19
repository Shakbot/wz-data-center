import assert from "node:assert/strict";
import test from "node:test";
import { candidateForExistingMatch, isTrainingCandidate } from "../functions/api/_training-definition.js";
import { onRequestPost as promote } from "../functions/api/promote-training/index.js";
import { readState, stripRetiredObservers, userFromRequest } from "../functions/api/_utils.js";

const users = [
  { identityCode: "03", role: "一般运动员" },
  { identityCode: "04", role: "特级运动员" },
  { identityCode: "T0", role: "特邀运动员" },
  { identityCode: "G4", role: "观察员" },
];

test("candidate requires both total OG and selected A/B role count", () => {
  const state = { users, trainingDefinition: { id: "a", totalMin: 3, mode: "A", groupMin: 2 } };
  assert.equal(isTrainingCandidate(state, ["03", "04", "G4"]), true);
  assert.equal(isTrainingCandidate(state, ["03", "T0", "G4"]), false);
  state.trainingDefinition = { id: "b", totalMin: 3, mode: "B", groupMin: 2 };
  assert.equal(isTrainingCandidate(state, ["03", "T0", "G4"]), true);
  assert.equal(isTrainingCandidate(state, ["03", "T0", "T0"]), false);
  assert.equal(isTrainingCandidate(state, ["03", "T0", "outsider"]), false);
  state.trainingDefinition = { id: "observers", totalMin: 1, mode: "A", groupMin: 0 };
  assert.equal(isTrainingCandidate(state, ["G4"]), true);
});

test("existing candidate status freezes when definition changes", () => {
  const state = { users, trainingDefinition: { id: "new-rule", totalMin: 4, mode: "A", groupMin: 3 } };
  const legacy = { isTrainingCandidate: true };
  const previous = { trainingDefinitionId: "old-rule", isTrainingCandidate: true };
  const current = { trainingDefinitionId: "new-rule", isTrainingCandidate: false };
  assert.equal(candidateForExistingMatch(state, legacy, ["03"]), true);
  assert.equal(candidateForExistingMatch(state, previous, ["03"]), true);
  assert.equal(candidateForExistingMatch(state, current, ["03", "04", "T0", "G4"]), false);
});

function memoryDb(initialState) {
  let state = structuredClone(initialState);
  let chunks = [];
  const sessions = new Map([["token", "03"], ["retired-token", "G1"]]);
  return {
    get state() { return state; },
    sessions,
    prepare(sql) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async first() {
          if (sql.startsWith("SELECT payload FROM sync_context")) return null;
          if (sql.startsWith("SELECT payload FROM app_state WHERE")) return { payload: JSON.stringify(state) };
          if (sql.startsWith("SELECT identity_code FROM sessions")) return sessions.has(args[0]) ? { identity_code: sessions.get(args[0]) } : null;
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          if (sql.startsWith("DELETE FROM sessions")) sessions.delete("retired-token");
          if (sql.startsWith("DELETE FROM app_state_chunks")) chunks = [];
          if (sql.startsWith("INSERT INTO app_state_chunks")) chunks[args[1]] = args[2];
          if (sql.includes("INSERT INTO app_state (")) state = JSON.parse(chunks.join(""));
          return {};
        },
      };
      return statement;
    },
    async batch(statements) { for (const statement of statements) await statement.run(); },
  };
}

test("retired G1-G3 accounts, sessions and linked records are removed", async () => {
  const db = memoryDb({
    users: [...users, { identityCode: "G1", role: "观察员" }],
    records: [{ userIdentityCode: "G1" }, { userIdentityCode: "G4" }],
    matchRecords: [{ matchId: "old", recognizedMemberCodes: ["G1", "G4"], isTrainingCandidate: true }],
    medals: [{ userIdentityCode: "G1" }],
    medalAnnouncements: [{ userIdentityCode: "G1" }],
    announcements: [{ readBy: ["G1", "03"] }],
  });
  const state = await readState(db);
  assert.equal(state.users.some((user) => user.identityCode === "G1"), false);
  assert.deepEqual(state.records.map((record) => record.userIdentityCode), ["G4"]);
  assert.deepEqual(state.announcements[0].readBy, ["03"]);
  assert.equal(state.matchRecords[0].isTrainingCandidate, true);
  assert.equal(db.sessions.has("retired-token"), false);
});

test("retired observer sessions cannot call authenticated APIs", async () => {
  const db = memoryDb({ users });
  const request = new Request("https://example.test/api/state", { headers: { authorization: "Bearer retired-token" } });
  assert.equal(await userFromRequest(request, db), null);
  assert.equal(db.sessions.has("retired-token"), false);
});

test("stale clients cannot restore retired account profiles", () => {
  const state = stripRetiredObservers({ users: [...users, { identityCode: "G2", role: "观察员" }], records: [{ userIdentityCode: "G2" }] });
  assert.equal(state.users.some((user) => user.identityCode === "G2"), false);
  assert.equal(state.records.length, 0);
});

test("auto-fill uses only complete candidates in selected season and full-match records", async () => {
  const makeMatch = (id, date, candidate, complete) => ({
    id: `match-${id}`, matchId: id, date, recognizedMemberCodes: ["03", "T0", "G4"],
    isTrainingCandidate: candidate, detailStatus: complete ? "complete" : "pending",
    hasSideDetails: complete, detailPlayerCount: complete ? 10 : 0,
  });
  const makeRecord = (id, code) => ({
    id: `${id}-${code}`, userIdentityCode: code, date: "2026-09-12",
    fiveE: { matchId: id }, rating: 1, rws: 10, adr: 80,
  });
  const db = memoryDb({
    users, seasons: [{ id: "season", start: "2026-09-01", end: "2026-09-30" }],
    matchRecords: [makeMatch("good", "2026-09-12", true, true), makeMatch("pending", "2026-09-12", true, false), makeMatch("not-candidate", "2026-09-12", false, true), makeMatch("outside", "2026-08-12", true, true)],
    records: [makeRecord("good", "03"), makeRecord("good", "G4"), makeRecord("pending", "03"), makeRecord("not-candidate", "03"), { id: "manual", userIdentityCode: "03", date: "2026-09-12" }],
  });
  const request = new Request("https://example.test/api/promote-training", {
    method: "POST", headers: { authorization: "Bearer token" }, body: JSON.stringify({ seasonId: "season", minMembers: 1, start: "2020-01-01" }),
  });
  const response = await promote({ request, env: { DB: db } });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.promotedMatches, 1);
  assert.equal(result.promotedRecords, 2);
  assert.deepEqual(db.state.records.filter((record) => record.trainingIncluded).map((record) => record.id).sort(), ["good-03", "good-G4"]);
});
