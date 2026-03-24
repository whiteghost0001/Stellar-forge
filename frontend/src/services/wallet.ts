import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction as freighterSignTransaction,
} from '@stellar/freighter-api'
import { STELLAR_CONFIG } from '../config/stellar'

const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/'

export class WalletService {
  private connectedAddress: string | null = null

  isInstalled(): boolean {
    return typeof window !== 'undefined'
  }

  async connect(): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error(
        `Freighter wallet is not installed. Please install it from ${FREIGHTER_INSTALL_URL}`
      )
    }

    try {
      // Request access to the wallet
      const accessObj = await requestAccess()

      if (accessObj.error) {
        throw new Error(accessObj.error)
      }

      if (!accessObj.address) {
        throw new Error(
          `Freighter wallet is not available. Please install or unlock it from ${FREIGHTER_INSTALL_URL}`
        )
      }

      this.connectedAddress = accessObj.address
      return accessObj.address
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to Freighter: ${error.message}`)
      }
      throw new Error('Failed to connect to Freighter wallet')
    }
  }

  disconnect(): void {
    this.connectedAddress = null
  }

  async signTransaction(xdr: string): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Freighter wallet is not installed')
    }

    if (!this.connectedAddress) {
      throw new Error('Wallet not connected. Please connect first.')
    }

    try {
      const network = this.getActiveNetwork()
      const networkPassphrase = STELLAR_CONFIG[network].networkPassphrase

      const signedResult = await freighterSignTransaction(xdr, {
        networkPassphrase,
        address: this.connectedAddress,
      })

      if (signedResult.error) {
        throw new Error(signedResult.error)
      }

      return signedResult.signedTxXdr
    } catch (error) {
      if (error instanceof Error) {
        // Check for network mismatch
        if (error.message.includes('network')) {
          throw new Error(
            `Network mismatch: Please switch Freighter to ${STELLAR_CONFIG.network}`
          )
        }
        throw new Error(`Failed to sign transaction: ${error.message}`)
      }
      throw new Error('Failed to sign transaction')
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const network = this.getActiveNetwork()
      const horizonUrl = STELLAR_CONFIG[network].horizonUrl

      const response = await fetch(`${horizonUrl}/accounts/${address}`)

      if (!response.ok) {
        if (response.status === 404) {
          return '0'
        }
        throw new Error(`Failed to fetch account: ${response.statusText}`)
      }

      const accountData = await response.json()

      // Find native XLM balance
      const nativeBalance = accountData.balances.find(
        (balance: any) => balance.asset_type === 'native'
      )

      return nativeBalance ? nativeBalance.balance : '0'
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get balance: ${error.message}`)
      }
      throw new Error('Failed to get balance')
    }
  }

  async checkExistingConnection(): Promise<string | null> {
    if (!this.isInstalled()) {
      return null
    }

    try {
      const connectedResult = await isConnected()
      if (connectedResult.error || !connectedResult.isConnected) {
        return null
      }

      const addressObj = await getAddress()
      if (addressObj.error || !addressObj.address) {
        return null
      }

      this.connectedAddress = addressObj.address
      return addressObj.address
    } catch (error) {
      console.error('Failed to check existing connection:', error)
    }

    return null
  }

  getConnectedAddress(): string | null {
    return this.connectedAddress
  }

  private getActiveNetwork(): 'testnet' | 'mainnet' {
    try {
      const stored = localStorage.getItem('stellarforge_network')
      if (stored === 'mainnet' || stored === 'testnet') return stored
    } catch { /* ignore */ }
    return STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  }
}

export const walletService = new WalletService()
