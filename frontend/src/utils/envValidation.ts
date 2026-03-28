// Environment variable validation

const REQUIRED_ENV_VARS = [
  {
    key: 'VITE_FACTORY_CONTRACT_ID',
    value: import.meta.env.VITE_FACTORY_CONTRACT_ID,
    description: 'Soroban token-factory contract address',
  },
  {
    key: 'VITE_IPFS_API_KEY',
    value: import.meta.env.VITE_IPFS_API_KEY,
    description: 'Pinata IPFS API key',
  },
  {
    key: 'VITE_IPFS_API_SECRET',
    value: import.meta.env.VITE_IPFS_API_SECRET,
    description: 'Pinata IPFS API secret',
  },
] as const

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
}

export function validateEnv(): EnvValidationResult {
  const missing = REQUIRED_ENV_VARS.filter((v) => !v.value || v.value.trim() === '').map(
    (v) => `${v.key} — ${v.description}`,
  )

  return { valid: missing.length === 0, missing }
}

export function assertEnv(): void {
  const { valid, missing } = validateEnv()
  if (!valid) {
    throw new Error(
      `Missing required environment variables:\n\n${missing.map((m) => `  • ${m}`).join('\n')}\n\nCopy frontend/.env.example to frontend/.env and fill in the values.`,
    )
  }
}
