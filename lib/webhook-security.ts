import { createHmac, timingSafeEqual } from 'node:crypto'
export function verifyRingSignature(raw: string, signature: string | null, key: string): boolean {
  if (!signature || !key) return false
  const received = signature.replace(/^sha256=/, '')
  if (!/^[a-fA-F0-9]{64}$/.test(received)) return false
  const expected = createHmac('sha256', key).update(raw).digest()
  return timingSafeEqual(expected, Buffer.from(received, 'hex'))
}
