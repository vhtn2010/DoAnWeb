export function createIdempotencyKey(scope = 'request') {
  const randomValue = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  return `${scope}-${randomValue}`
}
