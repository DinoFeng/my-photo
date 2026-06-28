import crypto from 'crypto'

const SALT_SIZE = 16
const HASH_SIZE = 32
const ITERATIONS = 100000
const DIGEST = 'sha256'
const SEPARATOR = '$'

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_SIZE)
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, HASH_SIZE, DIGEST)
  return `${salt.toString('hex')}${SEPARATOR}${ITERATIONS}${SEPARATOR}${hash.toString('hex')}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [saltHex, iterationsStr, hashHex] = storedHash.split(SEPARATOR)
    if (!saltHex || !iterationsStr || !hashHex) return false

    const salt = Buffer.from(saltHex, 'hex')
    const iterations = parseInt(iterationsStr, 10)
    const expectedHash = Buffer.from(hashHex, 'hex')

    const computedHash = crypto.pbkdf2Sync(password, salt, iterations, HASH_SIZE, DIGEST)

    return crypto.timingSafeEqual(computedHash, expectedHash)
  } catch {
    return false
  }
}

export function generateRandomId(byteLength: number = 16): string {
  return crypto.randomBytes(byteLength).toString('hex')
}

export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(12)
  return bytes.toString('hex').slice(0, 16)
}

export function generateShareToken(): string {
  const bytes = crypto.randomBytes(16)
  return bytes
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 22)
    .padEnd(22, 'a')
}