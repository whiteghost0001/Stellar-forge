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
