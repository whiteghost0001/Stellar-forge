import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTokens, _clearCache } from './useTokens'
import { stellarService } from '../services/stellar'

vi.mock('../services/stellar', () => ({
  stellarService: {
    getTokensByCreator: vi.fn(),
    getContractEvents: vi.fn(),
    getTokenInfo: vi.fn(),
  },
}))

vi.mock('../config/stellar', () => ({
  STELLAR_CONFIG: {
    network: 'testnet',
    factoryContractId: 'CFACTORY123',
    testnet: { sorobanRpcUrl: 'https://soroban-testnet.stellar.org' },
    mainnet: { sorobanRpcUrl: 'https://soroban-mainnet.stellar.org' },
  },
}))

const TOKEN_A = { name: 'TokenA', symbol: 'TKA', decimals: 7, creator: 'GABC', createdAt: 1000 }
const TOKEN_B = { name: 'TokenB', symbol: 'TKB', decimals: 7, creator: 'GABC', createdAt: 2000 }

beforeEach(() => {
  vi.clearAllMocks()
  _clearCache()
})

describe('useTokens', () => {
  it('returns isLoading true while fetching then false when done', async () => {
    vi.mocked(stellarService.getTokensByCreator).mockResolvedValue([TOKEN_A])

    const { result } = renderHook(() => useTokens('GABC'))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('returns tokens filtered by creator', async () => {
    vi.mocked(stellarService.getTokensByCreator).mockResolvedValue([TOKEN_A, TOKEN_B])

    const { result } = renderHook(() => useTokens('GABC'))

    await waitFor(() => expect(result.current.tokens).toHaveLength(2))
    expect(stellarService.getTokensByCreator).toHaveBeenCalledWith('GABC')
  })

  it('fetches all tokens in parallel when no creator given', async () => {
    vi.mocked(stellarService.getContractEvents).mockResolvedValue({
      events: [
        { id: '1', type: 'token_created', ledger: 1, timestamp: 1000, txHash: 'x', data: { tokenAddress: 'CAAA' } },
        { id: '2', type: 'token_created', ledger: 2, timestamp: 2000, txHash: 'y', data: { tokenAddress: 'CBBB' } },
      ],
      cursor: null,
    })
    vi.mocked(stellarService.getTokenInfo)
      .mockResolvedValueOnce(TOKEN_A)
      .mockResolvedValueOnce(TOKEN_B)

    const { result } = renderHook(() => useTokens())

    await waitFor(() => expect(result.current.tokens).toHaveLength(2))
    expect(stellarService.getTokenInfo).toHaveBeenCalledTimes(2)
  })

  it('populates error on RPC failure', async () => {
    vi.mocked(stellarService.getTokensByCreator).mockRejectedValue(new Error('RPC down'))

    const { result } = renderHook(() => useTokens('GABC'))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('RPC down')
    expect(result.current.tokens).toHaveLength(0)
  })

  it('refetch triggers a fresh fetch', async () => {
    vi.mocked(stellarService.getTokensByCreator).mockResolvedValue([TOKEN_A])

    const { result } = renderHook(() => useTokens('GABC'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    vi.mocked(stellarService.getTokensByCreator).mockResolvedValue([TOKEN_A, TOKEN_B])
    await act(async () => { result.current.refetch() })

    await waitFor(() => expect(result.current.tokens).toHaveLength(2))
    expect(stellarService.getTokensByCreator).toHaveBeenCalledTimes(2)
  })
})
