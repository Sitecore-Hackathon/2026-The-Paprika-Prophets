import { rateLimit } from "../rate-limit";

// The rate-limit module has a setInterval for cleanup; clear it after tests
afterAll(() => {
  jest.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const result = rateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterMs).toBe(0);
  });

  it("decrements remaining with each request", () => {
    const key = `test-decrement-${Date.now()}`;
    rateLimit(key, 3, 60_000);
    const r2 = rateLimit(key, 3, 60_000);
    expect(r2.remaining).toBe(1);
    const r3 = rateLimit(key, 3, 60_000);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests once the limit is reached", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);

    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("uses separate buckets for different keys", () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;
    rateLimit(keyA, 1, 60_000);

    const resultB = rateLimit(keyB, 1, 60_000);
    expect(resultB.allowed).toBe(true);
  });
});
