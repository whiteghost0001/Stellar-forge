# Mainnet Confirmation Modal

## Overview
This component provides a safety guard for mainnet token deployments by requiring explicit user confirmation before proceeding with deployment.

## Features
- Automatically detects mainnet network configuration
- Displays all token parameters for review
- Requires user to type the token symbol to confirm
- Shows warning about irreversible action and real XLM costs
- Skips confirmation on testnet

## Usage

### With the useMainnetConfirmation Hook

```tsx
import { useMainnetConfirmation } from '../../hooks/useMainnetConfirmation'
import { MainnetConfirmationModal } from './UI/MainnetConfirmationModal'

function YourComponent() {
  const { showModal, tokenParams, requestDeployment, closeModal, confirmDeployment } =
    useMainnetConfirmation()

  const handleDeploy = () => {
    const params = {
      name: 'My Token',
      symbol: 'MTK',
      decimals: 7,
      initialSupply: '1000000',
    }

    // This will show modal on mainnet, proceed directly on testnet
    requestDeployment(params, () => {
      // Your actual deployment logic here
      stellarService.deployToken(params)
    })
  }

  return (
    <>
      <button onClick={handleDeploy}>Deploy Token</button>
      
      {tokenParams && (
        <MainnetConfirmationModal
          isOpen={showModal}
          onClose={closeModal}
          onConfirm={confirmDeployment}
          tokenParams={tokenParams}
        />
      )}
    </>
  )
}
```

## Network Detection

The modal uses `isMainnet()` from `utils/network.ts` which checks:
```typescript
STELLAR_CONFIG.network === 'mainnet'
```

## Acceptance Criteria Met

✅ Detects when STELLAR_CONFIG.network === 'mainnet'
✅ Shows 'Mainnet Deployment Review' modal with all token parameters
✅ Requires user to type the token symbol to confirm
✅ Skips extra step on testnet
✅ Modal states 'This action cannot be undone and will cost real XLM'
