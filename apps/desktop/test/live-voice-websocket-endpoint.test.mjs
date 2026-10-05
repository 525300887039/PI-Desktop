import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

async function loadEndpoint(t) {
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  t.after(() => server.close());
  return server.ssrLoadModule("/electron/main/live-voice/websocket-endpoint.ts");
}

test("Realtime socket URL keeps TLS for HTTPS providers and maps HTTP providers to ws", async (t) => {
  const { realtimeSocketUrl } = await loadEndpoint(t);

  assert.equal(
    realtimeSocketUrl("https://api.openai.com/v1", "gpt-realtime"),
    "wss://api.openai.com/v1/realtime?model=gpt-realtime",
  );
  assert.equal(
    realtimeSocketUrl("https://example.test/v1/realtime/", "m"),
    "wss://example.test/v1/realtime?model=m",
  );
  assert.equal(
    realtimeSocketUrl("http://127.0.0.1:8010/v1", "local-model"),
    "ws://127.0.0.1:8010/v1/realtime?model=local-model",
  );
  assert.equal(
    realtimeSocketUrl("http://[::1]:8010/v1/", "m"),
    "ws://[::1]:8010/v1/realtime?model=m",
  );
});

test("Realtime socket URL rejects non-HTTP schemes, credentials, query and fragment", async (t) => {
  const { realtimeSocketUrl } = await loadEndpoint(t);

  for (const baseUrl of [
    "not a url",
    "ws://127.0.0.1:8010/v1",
    "file:///tmp/realtime",
    "http://user:secret@127.0.0.1:8010/v1",
    "https://api.example.test/v1?key=1",
    "https://api.example.test/v1#frag",
  ]) {
    assert.throws(() => realtimeSocketUrl(baseUrl, "m"), { errorCode: "LIVE_PROTOCOL_UNSUPPORTED" }, baseUrl);
  }
});

test("Live socket guard URL allows plain ws only for user-supplied endpoints", async (t) => {
  const { liveSocketGuardUrl } = await loadEndpoint(t);

  assert.equal(
    liveSocketGuardUrl("wss://generativelanguage.googleapis.com/ws?x=1", "third-party"),
    "https://generativelanguage.googleapis.com/ws?x=1",
  );
  assert.equal(
    liveSocketGuardUrl("wss://api.openai.com/v1/realtime?model=m", "user"),
    "https://api.openai.com/v1/realtime?model=m",
  );
  assert.equal(
    liveSocketGuardUrl("ws://127.0.0.1:8010/v1/realtime?model=m", "user"),
    "http://127.0.0.1:8010/v1/realtime?model=m",
  );
  assert.throws(
    () => liveSocketGuardUrl("ws://127.0.0.1:8010/v1/realtime", "third-party"),
    { errorCode: "LIVE_NETWORK_POLICY_UNSUPPORTED" },
  );
  assert.throws(
    () => liveSocketGuardUrl("https://api.openai.com/v1/realtime", "user"),
    { errorCode: "LIVE_NETWORK_POLICY_UNSUPPORTED" },
  );
});
