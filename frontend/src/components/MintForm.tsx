import { useState, useEffect } from 'react'
import { Input } from './UI/Input'
import { useDebounce } from '../hooks/useDebounce'
import { stellarService } from '../services/stellar'
// import { useWallet } from '../hooks/useWallet'
// import { walletService } from '../services/wallet'

export const MintForm: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  // const { wallet } = useWallet()

  const debouncedAddress = useDebounce(tokenAddress, 300)

  useEffect(() => {
    if (!debouncedAddress) return
    stellarService.getTokenInfo(debouncedAddress).then(setTokenInfo)
  }, [debouncedAddress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Example: How to sign a transaction with Freighter
    // if (!wallet.isConnected) {
    //   alert('Please connect your wallet first')
    //   return
    // }
    
    // 1. Build your transaction XDR using stellar-sdk
    // const xdr = await stellarService.buildMintTransaction(tokenAddress, amount, wallet.address)
    
    // 2. Sign the transaction with Freighter
    // try {
    //   const signedXdr = await walletService.signTransaction(xdr)
    //   
    //   // 3. Submit the signed transaction to Horizon
    //   const result = await stellarService.submitTransaction(signedXdr)
    //   console.log('Transaction successful:', result)
    // } catch (error) {
    //   console.error('Transaction failed:', error)
    // }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Token Address"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="G..."
      />
      {tokenInfo && <p className="text-sm text-gray-600">Token found: {JSON.stringify(tokenInfo)}</p>}
      <Input
        label="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
      />
      <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Mint
      </button>
    </form>
  )
}
