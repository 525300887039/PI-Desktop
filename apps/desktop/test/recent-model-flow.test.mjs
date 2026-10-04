import i18n from "i18next";
import { en } from "@pi-desktop/i18n";
import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { useAppStore, materializeDraftSession } = await import("../src/stores/app-store.ts");
const { api } = await import("../src/lib/api.ts");
const { loadRecentModels } = await import("../src/lib/recent-models.ts");

test("select model, create chat, change model and restore history through real store actions", async t => {
  await i18n.init({ lng: "en", resources: { en: { translation: en } } });
  const previousStorage = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  t.after(() => { globalThis.localStorage = previousStorage; });
  const provider = { id: "p", enabled: true, authKind: "none", models: [{ id: "a" }, { id: "b" }] };
  useAppStore.setState({ providers: [provider], activeSessionId: null, sessions: [], recentModels: [], draftConfiguration: null,
    settings: { defaultProviderId: "p", defaultModelId: "a", defaultMode: "agent" }, workspace: null });
  await useAppStore.getState().configureActiveSession({ mode: "agent", providerId: "p", modelId: "b", thinkingLevel: "off" });
  assert.deepEqual(loadRecentModels(), [{ providerId: "p", modelId: "b" }]);
  useAppStore.setState({ draftConfiguration: null });
  let nextId = 0;
  t.mock.method(api, "createSession", async config => ({ session: { ...config, id: `s${++nextId}`, messages: [] } }));
  await materializeDraftSession();
  const first = useAppStore.getState().sessions.find(s => s.id === "s1");
  assert.equal(first.modelId, "b");
  t.mock.method(api, "configureSession", async (id, config) => ({ session: { ...first, ...config, id } }));
  await useAppStore.getState().configureActiveSession({ mode: "agent", providerId: "p", modelId: "a", thinkingLevel: "off" });
  assert.deepEqual(loadRecentModels().map(m => m.modelId), ["a", "b"]);
  t.mock.method(api, "configureSession", async () => { throw new Error("configuration rejected"); });
  await assert.rejects(useAppStore.getState().configureActiveSession({ mode: "agent", providerId: "p", modelId: "b", thinkingLevel: "off" }));
  assert.equal(loadRecentModels()[0].modelId, "a");
  useAppStore.setState({ activeSessionId: null, draftConfiguration: null, recentModels: loadRecentModels() });
  await materializeDraftSession();
  assert.equal(useAppStore.getState().sessions.find(s => s.id === "s2").modelId, "a");
  assert.equal(first.modelId, "b", "original binding snapshot is immutable");
  useAppStore.setState({ sessions: useAppStore.getState().sessions.map(session =>
    session.id === "s2" ? { ...session, title: "Existing conversation", modelId: "b" } : session),
  });
  t.mock.method(api, "prompt", async () => ({}));
  const accepted = await useAppStore.getState().sendPrompt("test existing model");
  assert.equal(accepted, true, JSON.stringify(useAppStore.getState().messages));
  assert.equal(loadRecentModels()[0].modelId, "b", "sending in an existing chat records its own model");
  useAppStore.setState({ runningSessions: {}, isRunning: false, sessions: useAppStore.getState().sessions.map(session =>
    session.id === "s2" ? { ...session, modelId: "a" } : session),
  });
  t.mock.method(api, "prompt", async () => { throw new Error("submission rejected"); });
  assert.equal(await useAppStore.getState().sendPrompt("rejected"), false);
  assert.equal(loadRecentModels()[0].modelId, "b", "rejection cannot replace the last used binding");

});
