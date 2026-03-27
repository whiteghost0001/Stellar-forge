// Stellar SDK integration service
import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
  FeeBumpTransaction,
  Transaction,
} from 'stellar-sdk'
import { STELLAR_CONFIG } from '../config/stellar'
import { walletService } from './wallet'
import type {
  ContractEvent,
  ContractEventType,
  DeploymentResult,
  FactoryState,
  GetEventsResult,
  TokenInfo,
} from '../types'

export type { FactoryState } from '../types'

// ── Utilities ─────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// ── Contract error codes ──────────────────────────────────────────────────────

const CONTRACT_ERRORS: Record<number, string> = {
  1: 'Insufficient fee payment. Please increase the fee amount.',
  2: 'Unauthorized. You do not have permission to perform this action.',
  3: 'Invalid parameters provided.',
  4: 'Token not found.',
  5: 'Metadata has already been set for this token.',
  6: 'Contract is already initialized.',
  7: 'Burn amount exceeds your token balance.',
  8: 'Burning is not enabled for this token.',
  9: 'Invalid burn amount. Must be greater than zero.',
  10: 'Contract is paused. Please try again later.',
}

function parseContractError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)

  // Soroban contract errors surface as "Error(Contract, X)" in the result XDR
  const match = msg.match(/Error\(Contract,\s*(\d+)\)/)
  if (match?.[1]) {
    const code = parseInt(match[1], 10)
    return new Error(CONTRACT_ERRORS[code] ?? `Contract error code ${code}`)
  }

  // Simulation failure messages
  if (msg.includes('simulation')) return new Error(`Simulation failed: ${msg}`)

  return err instanceof Error ? err : new Error(msg)
}

// ── Network helpers ───────────────────────────────────────────────────────────

function getNetworkConfig() {
  const network = STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  return STELLAR_CONFIG[network]
}

function getNetworkPassphrase(): string {
  const network = STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
}

function getRpcServer(): rpc.Server {
  return new rpc.Server(getNetworkConfig().sorobanRpcUrl, {
    allowHttp: false,
  })
}

function getRpcUrl(): string {
  return getNetworkConfig().sorobanRpcUrl
}

// ── Transaction lifecycle ─────────────────────────────────────────────────────

/**
 * Simulate, sign, and submit a Soroban transaction.
 * Returns the transaction hash on success.
 */
async function simulateAndSubmit(
  server: rpc.Server,
  tx: ReturnType<TransactionBuilder['build']>,
): Promise<string> {
  // 1. Simulate to get resource fees and check for errors
  const simResult = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simResult)) {
    throw parseContractError(new Error(simResult.error))
  }

  if (!rpc.Api.isSimulationSuccess(simResult)) {
    throw new Error('Transaction simulation returned an unexpected result')
  }

  // 2. Assemble the transaction with the simulated resource data
  const assembled = rpc.assembleTransaction(tx, simResult).build()

  // 3. Sign via Freighter
  const signedXdr = await walletService.signTransaction(assembled.toXDR())

  // 4. Submit
  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase()),
  )

  if (submitResult.status === 'ERROR') {
    throw parseContractError(new Error(submitResult.errorResult?.toXDR('base64') ?? 'Submission failed'))
  }

  const hash = submitResult.hash

  // 5. Poll until the transaction is confirmed
  await pollTransaction(server, hash)

  return hash
}

async function pollTransaction(
  server: rpc.Server,
  hash: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<rpc.Api.GetTransactionResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await server.getTransaction(hash)
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return result
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw parseContractError(new Error(`Transaction failed: ${hash}`))
    }
    // NOT_FOUND means still pending — wait and retry
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`Transaction ${hash} timed out after ${maxAttempts} attempts`)
}

// ── Fee Bump Transactions ─────────────────────────────────────────────────────

/**
 * Wraps an inner (signed) transaction in a fee bump transaction.
 *
 * Use this when the inner transaction's source account has insufficient XLM to
 * cover the base fee. The `feeSource` account pays the network fee instead,
 * allowing the inner transaction to succeed even with a near-empty balance.
 *
 * Flow:
 *  1. Build and sign the inner transaction normally (e.g. via simulateAndSubmit).
 *  2. Pass the signed inner XDR and a fee-source address to this function.
 *  3. The fee-source account signs the resulting fee bump envelope.
 *  4. Submit the fee bump transaction to the network.
 *
 * @param innerTxXdr  - Base64 XDR of the signed inner transaction.
 * @param feeSource   - Stellar address that will pay the base fee.
 * @param baseFee     - Fee per operation in stroops (defaults to 10× BASE_FEE
 *                      to ensure the bump is accepted by the network).
 * @returns The signed fee bump transaction XDR ready for submission.
 */
export async function buildFeeBumpTransaction(
  innerTxXdr: string,
  feeSource: string,
  baseFee: string = String(Number(BASE_FEE) * 10),
): Promise<string> {
  const networkPassphrase = getNetworkPassphrase()

  // Reconstruct the inner transaction from XDR
  const innerTx = TransactionBuilder.fromXDR(innerTxXdr, networkPassphrase) as Transaction

  // Build the fee bump envelope
  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    baseFee,
    innerTx,
    networkPassphrase,
  )

  // The fee-source account must sign the fee bump envelope
  const signedFeeBumpXdr = await walletService.signTransaction(feeBumpTx.toXDR())

  return signedFeeBumpXdr
}

/**
 * Submit a signed fee bump transaction and wait for confirmation.
 *
 * @param signedFeeBumpXdr - Base64 XDR of the signed fee bump transaction.
 * @returns The transaction hash on success.
 */
export async function submitFeeBumpTransaction(signedFeeBumpXdr: string): Promise<string> {
  const server = getRpcServer()
  const networkPassphrase = getNetworkPassphrase()

  const feeBumpTx = TransactionBuilder.fromXDR(
    signedFeeBumpXdr,
    networkPassphrase,
  ) as FeeBumpTransaction

  const submitResult = await server.sendTransaction(feeBumpTx)

  if (submitResult.status === 'ERROR') {
    throw parseContractError(
      new Error(submitResult.errorResult?.toXDR('base64') ?? 'Fee bump submission failed'),
    )
  }

  await pollTransaction(server, submitResult.hash)

  return submitResult.hash
}

/**
 * Build a base TransactionBuilder for the given source account.
 */
async function buildTxBuilder(
  server: rpc.Server,
  sourceAddress: string,
): Promise<TransactionBuilder> {
  const account = await server.getAccount(sourceAddress)
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
}

// ── Raw RPC types ────────────────────────────────────────────────────────────

interface RpcEventResponse {
  id: string
  type: string
  ledger: number
  ledgerClosedAt: string
  contractId: string
  pagingToken: string
  inSuccessfulContractCall: boolean
  txHash: string
  topic: string[]   // base64-encoded XDR ScVal[]
  value: string     // base64-encoded XDR ScVal
}

interface RpcGetEventsResult {
  events: RpcEventResponse[]
  latestLedger: number
}

// ── XDR decode helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scValToString(val: any): string {
  try {
    const v = val as {
      switch: () => unknown
      address: () => {
        switch: () => unknown
        accountId: () => { publicKey: () => { toString: () => string } }
        contractId: () => Uint8Array
      }
      i128: () => { hi: () => { toString: () => string }; lo: () => { toString: () => string } }
      u64: () => { toString: () => string }
      str: () => { toString: () => string }
      sym: () => { toString: () => string }
      vec: () => unknown[] | null
      toXDR: (format: 'base64') => string
    }
    const type = v.switch()
    if (type === xdr.ScValType.scvAddress()) {
      const addr = v.address()
      if (addr.switch() === xdr.ScAddressType.scAddressTypeAccount()) {
        return addr.accountId().publicKey().toString()
      }
      const bytes: Uint8Array = addr.contractId()
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    if (type === xdr.ScValType.scvI128()) {
      const hi = BigInt(v.i128().hi().toString())
      const lo = BigInt(v.i128().lo().toString())
      return ((hi << 64n) | lo).toString()
    }
    if (type === xdr.ScValType.scvU64()) return v.u64().toString()
    if (type === xdr.ScValType.scvString()) return v.str().toString()
    if (type === xdr.ScValType.scvSymbol()) return v.sym().toString()
    if (type === xdr.ScValType.scvVoid()) return 'none'
    if (type === xdr.ScValType.scvBool()) return val.b().toString()
    if (type === xdr.ScValType.scvVec()) {
      const items: string[] = (val.vec() ?? []).map((v: xdr.ScVal) => scValToString(v))
      return items.join(', ')
    }
    return val.toXDR('base64')
  } catch {
    return ''
  }
}

const EVENT_TOPICS: ContractEventType[] = [
  'token_created',
  'tokens_minted',
  'tokens_burned',
  'metadata_set',
  'fees_updated',
]

// ── Event parsing ─────────────────────────────────────────────────────────────

async function parseRpcEvent(raw: RpcEventResponse): Promise<ContractEvent | null> {
  try {
    if (!raw.topic?.length) return null

    const topic0 = raw.topic[0]
    if (!topic0) return null
    const topicVal = xdr.ScVal.fromXDR(topic0, 'base64')
    const eventType = scValToString(topicVal) as ContractEventType
    if (!EVENT_TOPICS.includes(eventType)) return null

    const valueVal = xdr.ScVal.fromXDR(raw.value, 'base64')
    const items: unknown[] = valueVal.vec() ?? []

    const data: Record<string, string> = {}

    switch (eventType) {
      case 'token_created':
        data.tokenAddress = scValToString(items[0])
        data.creator = scValToString(items[1])
        break
      case 'tokens_minted':
        data.tokenAddress = scValToString(items[0])
        data.to = scValToString(items[1])
        data.amount = scValToString(items[2])
        break
      case 'tokens_burned':
        data.tokenAddress = scValToString(items[0])
        data.from = scValToString(items[1])
        data.amount = scValToString(items[2])
        break
      case 'metadata_set':
        data.tokenAddress = scValToString(items[0])
        data.metadataUri = scValToString(items[1])
        break
      case 'fees_updated':
        data.baseFee = scValToString(items[0])
        data.metadataFee = scValToString(items[1])
        break
    }

    return {
      id: raw.id,
      type: eventType,
      ledger: raw.ledger,
      timestamp: raw.ledgerClosedAt
        ? Math.floor(new Date(raw.ledgerClosedAt).getTime() / 1000)
        : 0,
      txHash: raw.txHash,
      data,
    }
  } catch {
    return null
  }
}

// ── JSON-RPC helper ───────────────────────────────────────────────────────────

async function rpcCall<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch(getRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC HTTP error ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message ?? 'RPC error')
  return json.result as T
}

// ── View function helper ──────────────────────────────────────────────────────

/**
 * Call a read-only (view) contract function via simulation.
 * No signing or submission required.
 */
async function callView(
  server: rpc.Server,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourceAddress: string,
): Promise<xdr.ScVal> {
  const contract = new Contract(contractId)
  const account = await server.getAccount(sourceAddress)
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simResult)) {
    throw parseContractError(new Error(simResult.error))
  }

  if (!rpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
    throw new Error(`View call to ${method} returned no result`)
  }

  return simResult.result.retval
}

// ── StellarService ────────────────────────────────────────────────────────────

export class StellarService {
  /**
   * Deploy a new token via the factory's create_token function.
   * Requires a connected wallet (Freighter).
   */
  async deployToken(params: {
    name: string
    symbol: string
    decimals: number
    initialSupply: string
    salt: string          // 32-byte hex string, unique per creator
    tokenWasmHash: string // 32-byte hex hash of the token WASM
    feePayment: string    // i128 as string (stroops)
  }): Promise<DeploymentResult> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer()
      const contract = new Contract(contractId)

      const saltBytes = hexToBytes(params.salt.padEnd(64, '0').slice(0, 64))
      const wasmHashBytes = hexToBytes(params.tokenWasmHash.padEnd(64, '0').slice(0, 64))

      const txBuilder = await buildTxBuilder(server, sourceAddress)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'create_token',
            new Address(sourceAddress).toScVal(),           // creator
            nativeToScVal(saltBytes, { type: 'bytes' }),    // salt: BytesN<32>
            nativeToScVal(wasmHashBytes, { type: 'bytes' }),// token_wasm_hash: BytesN<32>
            nativeToScVal(params.name, { type: 'string' }), // name
            nativeToScVal(params.symbol, { type: 'string' }),// symbol
            nativeToScVal(params.decimals, { type: 'u32' }),// decimals
            nativeToScVal(BigInt(params.initialSupply), { type: 'i128' }), // initial_supply
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }),    // fee_payment
          ),
        )
        .setTimeout(30)
        .build()

      const hash = await simulateAndSubmit(server, tx)

      // The return value is the new token address — fetch it from the transaction result
      const txResult = await server.getTransaction(hash)
      let tokenAddress = ''
      if (
        txResult.status === rpc.Api.GetTransactionStatus.SUCCESS &&
        txResult.returnValue
      ) {
        tokenAddress = scValToNative(txResult.returnValue) as string
      }

      return { tokenAddress, transactionHash: hash, success: true }
    } catch (err) {
      throw parseContractError(err)
    }
  }

  /**
   * Mint additional tokens to a recipient address.
   */
  async mintTokens(params: {
    tokenAddress: string
    to: string
    amount: string    // i128 as string
    feePayment: string // i128 as string
  }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer()
      const contract = new Contract(contractId)

      const txBuilder = await buildTxBuilder(server, sourceAddress)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'mint_tokens',
            new Address(params.tokenAddress).toScVal(), // token_address
            new Address(sourceAddress).toScVal(),       // admin
            new Address(params.to).toScVal(),           // to
            nativeToScVal(BigInt(params.amount), { type: 'i128' }),     // amount
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }), // fee_payment
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx)
    } catch (err) {
      throw parseContractError(err)
    }
  }

  /**
   * Burn tokens from the caller's balance.
   */
  async burnTokens(params: {
    tokenAddress: string
    amount: string // i128 as string
  }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer()
      const contract = new Contract(contractId)

      const txBuilder = await buildTxBuilder(server, sourceAddress)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'burn',
            new Address(params.tokenAddress).toScVal(),                // token_address
            new Address(sourceAddress).toScVal(),                      // from
            nativeToScVal(BigInt(params.amount), { type: 'i128' }),    // amount
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx)
    } catch (err) {
      throw parseContractError(err)
    }
  }

  /**
   * Set IPFS metadata URI for a token.
   */
  async setMetadata(params: {
    tokenAddress: string
    metadataUri: string
    feePayment: string // i128 as string
  }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer()
      const contract = new Contract(contractId)

      const txBuilder = await buildTxBuilder(server, sourceAddress)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'set_metadata',
            new Address(params.tokenAddress).toScVal(),                    // token_address
            new Address(sourceAddress).toScVal(),                          // admin
            nativeToScVal(params.metadataUri, { type: 'string' }),         // metadata_uri
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }),    // fee_payment
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx)
    } catch (err) {
      throw parseContractError(err)
    }
  }

  /**
   * Fetch TokenInfo for a given factory index via the get_token_info view function.
   * Falls back to event-derived data if no wallet is connected.
   */
  async getTokenInfo(tokenAddressOrIndex: string | number): Promise<TokenInfo> {
    const contractId = STELLAR_CONFIG.factoryContractId

    // If given a token address (not an index), fall back to event scanning
    if (typeof tokenAddressOrIndex === 'string') {
      return this._getTokenInfoByAddress(tokenAddressOrIndex)
    }

    if (!contractId) throw new Error('Factory contract ID is not configured')

    const sourceAddress = walletService.getConnectedAddress()
    if (!sourceAddress) {
      // No wallet — fall back to event scanning for the index
      return this._getTokenInfoByAddress(String(tokenAddressOrIndex))
    }

    try {
      const server = getRpcServer()
      const retval = await callView(
        server,
        contractId,
        'get_token_info',
        [nativeToScVal(tokenAddressOrIndex as number, { type: 'u32' })],
        sourceAddress,
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const native = scValToNative(retval) as any
      return {
        name: native.name ?? '',
        symbol: native.symbol ?? '',
        decimals: Number(native.decimals ?? 7),
        creator: native.creator?.toString() ?? '',
        createdAt: Number(native.created_at ?? 0),
        totalSupply: native.total_supply?.toString(),
      }
    } catch (err) {
      throw parseContractError(err)
    }
  }

  /**
   * Fetch FactoryState via the get_state view function.
   */
  async getFactoryState(): Promise<FactoryState> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) throw new Error('Factory contract ID is not configured')

    const sourceAddress = walletService.getConnectedAddress()
    if (!sourceAddress) throw new Error('Wallet not connected')

    try {
      const server = getRpcServer()
      const retval = await callView(server, contractId, 'get_state', [], sourceAddress)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const native = scValToNative(retval) as any
      return {
        admin: native.admin?.toString() ?? '',
        paused: Boolean(native.paused),
        treasury: native.treasury?.toString() ?? '',
        baseFee: native.base_fee?.toString() ?? '0',
        metadataFee: native.metadata_fee?.toString() ?? '0',
        tokenCount: Number(native.token_count ?? 0),
      }    } catch (err) {
      throw parseContractError(err)
    }
  }

  /**
   * Fetch a transaction's details from Horizon by hash.
   */
  async getTransaction(hash: string): Promise<Record<string, unknown>> {
    try {
      const { horizonUrl } = getNetworkConfig()
      const res = await fetch(`${horizonUrl}/transactions/${hash}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Transaction not found: ${hash}`)
        throw new Error(`Horizon error ${res.status}`)
      }
      return res.json()
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Derive TokenInfo by scanning factory contract events for a given token address.
   */
  private async _getTokenInfoByAddress(tokenAddress: string): Promise<TokenInfo> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) {
      return {
        name: tokenAddress,
        symbol: '—',
        decimals: 7,
        totalSupply: '0',
        creator: '',
        createdAt: 0,
      }
    }

    const { events } = await this.getContractEvents(contractId, 100)
    const tokenEvents = events.filter((e) => e.data.tokenAddress === tokenAddress)

    if (!tokenEvents.length) throw new Error(`Token not found: ${tokenAddress}`)

    const creationEvent = tokenEvents.find((e) => e.type === 'token_created')
    const metadataEvent = [...tokenEvents]
      .filter((e) => e.type === 'metadata_set')
      .sort((a, b) => b.ledger - a.ledger)[0]

    let supply = 0n
    for (const e of tokenEvents) {
      if (e.type === 'tokens_minted') supply += BigInt(e.data.amount ?? '0')
      if (e.type === 'tokens_burned') supply -= BigInt(e.data.amount ?? '0')
    }

    return {
      name: tokenAddress,
      symbol: '—',
      decimals: 7,
      totalSupply: supply.toString(),
      creator: creationEvent?.data.creator ?? '',
      createdAt: creationEvent?.timestamp ?? 0,
      ...(metadataEvent?.data.metadataUri ? { metadataUri: metadataEvent.data.metadataUri } : {}),
    }
  }

  /**
   * Fetch all tokens created by a specific creator address.
   */
  async getTokensByCreator(creator: string): Promise<TokenInfo[]> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) return []

    const { events } = await this.getContractEvents(contractId, 100)
    const results: TokenInfo[] = []

    for (const event of events) {
      if (event.type === 'token_created' && event.data.creator === creator) {
        const tokenAddress = event.data.tokenAddress
        if (!tokenAddress) continue
        try {
          const info = await this._getTokenInfoByAddress(tokenAddress)
          results.push(info)
        } catch {
          // skip tokens that fail to load
        }
      }
    }

    return results
  }

  /**
   * Fetch and parse contract events for the factory, newest-first.
   */
  async getContractEvents(
    contractId: string,
    limit = 20,
    cursor?: string,
  ): Promise<GetEventsResult> {
    const params: Record<string, unknown> = {
      filters: [{ type: 'contract', contractIds: [contractId] }],
      pagination: { limit, ...(cursor ? { cursor } : {}) },
    }

    const result = await rpcCall<RpcGetEventsResult>('getEvents', params)

    const parsed = await Promise.all(result.events.map(parseRpcEvent))
    const events = parsed
      .filter((e): e is ContractEvent => e !== null)
      .sort((a, b) => b.ledger - a.ledger)

    const lastEvent = result.events[result.events.length - 1]
    return { events, cursor: lastEvent?.pagingToken ?? null }
  }

  async getAllTokens(): Promise<TokenInfo[]> {
    // TODO: replace with real contract/horizon query
    return []
  }
}

export const stellarService = new StellarService()
