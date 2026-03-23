import { describe, it, expect } from 'vitest'
import { isValidIPFSUri } from '../utils/validation'

describe('isValidIPFSUri', () => {
  it('accepts a valid CIDv0 URI', () => {
    expect(isValidIPFSUri('ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco')).toBe(true)
  })

  it('accepts a valid CIDv1 URI', () => {
    expect(isValidIPFSUri('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(isValidIPFSUri('')).toBe(false)
  })

  it('rejects an HTTP URL', () => {
    expect(isValidIPFSUri('https://example.com/image.png')).toBe(false)
  })

  it('rejects ipfs:// with no CID', () => {
    expect(isValidIPFSUri('ipfs://')).toBe(false)
  })

  it('rejects a malformed CID', () => {
    expect(isValidIPFSUri('ipfs://notacid')).toBe(false)
  })

  it('rejects a plain CID without ipfs:// prefix', () => {
    expect(isValidIPFSUri('QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco')).toBe(false)
  })
})

import { validateTokenParams } from '../utils/validation'

const base = { name: 'MyToken', symbol: 'MTK', initialSupply: '1000' }

describe('validateTokenParams - decimals', () => {
  it('accepts decimals = 0', () => {
    expect(validateTokenParams({ ...base, decimals: 0 }).valid).toBe(true)
  })

  it('accepts decimals = 18', () => {
    expect(validateTokenParams({ ...base, decimals: 18 }).valid).toBe(true)
  })

  it('rejects decimals = -1', () => {
    const { valid, errors } = validateTokenParams({ ...base, decimals: -1 })
    expect(valid).toBe(false)
    expect(errors.decimals).toBeDefined()
  })

  it('rejects decimals = 19', () => {
    const { valid, errors } = validateTokenParams({ ...base, decimals: 19 })
    expect(valid).toBe(false)
    expect(errors.decimals).toBeDefined()
  })

  it('rejects missing decimals', () => {
    const { valid, errors } = validateTokenParams({ ...base, decimals: undefined })
    expect(valid).toBe(false)
    expect(errors.decimals).toBeDefined()
  })
})
