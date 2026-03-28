import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { MintForm } from './MintForm'
import { stellarService } from '../services/stellar'
import { TosProvider } from '../context/TosContext'

vi.mock('../services/stellar', () => ({
  stellarService: {
    getTokenInfo: vi.fn().mockRejectedValue(new Error('not found')),
    accountExists: vi.fn(),
  },
}))

const renderMintForm = () =>
  render(
    <TosProvider>
      <MintForm />
    </TosProvider>,
  )

describe('MintForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    ;(stellarService.accountExists as Mock).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces recipient account validation by 500ms', async () => {
    renderMintForm()

    const recipientInput = screen.getByLabelText('Recipient Address', { exact: false })
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

    renderMintForm()

    fireEvent.change(screen.getByLabelText('Recipient Address', { exact: false }), {
      target: { value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' },
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(
      await screen.findByText(
        'This address does not have a Stellar account yet. It may need to be funded first.',
      ),
    ).toBeInTheDocument()
  })
})
