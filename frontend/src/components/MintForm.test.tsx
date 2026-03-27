import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { MintForm } from './MintForm'
import { stellarService } from '../services/stellar'

vi.mock('../services/stellar', () => ({
  stellarService: {
    getTokenInfo: vi.fn().mockRejectedValue(new Error('not found')),
    accountExists: vi.fn(),
  },
}))

describe('MintForm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    ;(stellarService.accountExists as Mock).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces recipient account validation by 500ms', async () => {
    render(<MintForm />)

    const recipientInput = screen.getByLabelText('Recipient Address')
    fireEvent.change(recipientInput, {
      target: { value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' },
    })

    expect(stellarService.accountExists).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(499)
    })

    expect(stellarService.accountExists).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    await waitFor(() => {
      expect(stellarService.accountExists).toHaveBeenCalledTimes(1)
    })
  })

  it('shows a warning when the recipient account is not funded', async () => {
    ;(stellarService.accountExists as Mock).mockResolvedValue(false)

    render(<MintForm />)

    fireEvent.change(screen.getByLabelText('Recipient Address'), {
      target: { value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' },
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(
      await screen.findByText('This address does not have a Stellar account yet. It may need to be funded first.'),
    ).toBeInTheDocument()
  })
})
