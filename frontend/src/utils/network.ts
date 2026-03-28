import { STELLAR_CONFIG } from '../config/stellar'

export const isMainnet = (): boolean => {
  return STELLAR_CONFIG.network === 'mainnet'
}

export const getNetworkName = (): string => {
  return STELLAR_CONFIG.network
}
