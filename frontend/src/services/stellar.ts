// Stellar SDK integration service
import { STELLAR_CONFIG } from '../config/stellar'
import type { ContractEvent, ContractEventType, GetEventsResult, TokenInfo } from '../types'

const EVENT_TOPICS: ContractEventType[] = [
  'token_created',
  'tokens_minted',
  'tokens_burned',
  'metadata_set',
  'fees_updated',
]

function getRpcUrl(): string {
  const network = STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  return STELLAR_CONFIG[network].sorobanRpcUrl
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

// ── XDR decode helpers (no SDK dependency) ───────────────────────────────────

/**
 * Decode a base64 XDR ScVal to a human-readable string.
 * We use the stellar-sdk xdr module dynamically so the service still compiles
 * even if types aren't resolved at edit time.
 */
async function scValB64ToString(b64: string): Promise<string> {
  try {
    // Dynamic import keeps the bundle tree-shakeable and avoids top-level type issues
    const { xdr } = await import('stellar-sdk')
    const val = xdr.ScVal.fromXDR(b64, 'base64')
    return scValToString(val, xdr)
  } catch {
    return b64
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scValToString(val: any, xdr: any): string {
  try {
    const type = val.switch()
    if (type === xdr.ScValType.scvAddress()) {
      const addr = val.address()
      if (addr.switch() === xdr.ScAddressType.scAddressTypeAccount()) {
        return addr.accountId().publicKey().toString()
      }
      return Buffer.from(addr.contractId()).toString('hex')
    }
    if (type === xdr.ScValType.scvI128()) {
      const hi = BigInt(val.i128().hi().toString())
      const lo = BigInt(val.i128().lo().toString())
      return ((hi << 64n) | lo).toString()
    }
    if (type === xdr.ScValType.scvU64()) return val.u64().toString()
    if (type === xdr.ScValType.scvString()) return val.str().toString()
    if (type === xdr.ScValType.scvSymbol()) return val.sym().toString()
    if (type === xdr.ScValType.scvVoid()) return 'none'
    if (type === xdr.ScValType.scvVec()) {
      const items: string[] = (val.vec() ?? []).map((v: any) => scValToString(v, xdr))
      return items.join(', ')
    }
    return b64ToString(val.toXDR('base64'))
  } catch {
    return ''
  }
}

function b64ToString(b64: string): string {
  try {
    return atob(b64)
  } catch {
    return b64
  }
}

// ── Event parsing ─────────────────────────────────────────────────────────────

async function parseRpcEvent(raw: RpcEventResponse): Promise<ContractEvent | null> {
  try {
    if (!raw.topic?.length) return null

    // topic[0] is the event name symbol
    const eventType = (await scValB64ToString(raw.topic[0])) as ContractEventType
    if (!EVENT_TOPICS.includes(eventType)) return null

    const { xdr } = await import('stellar-sdk')
    const valueVal = xdr.ScVal.fromXDR(raw.value, 'base64')
    const items: any[] = valueVal.vec() ?? []

    const data: Record<string, string> = {}

    switch (eventType) {
      case 'token_created':
        data.tokenAddress = scValToString(items[0], xdr)
        data.creator = scValToString(items[1], xdr)
        break
      case 'tokens_minted':
        data.tokenAddress = scValToString(items[0], xdr)
        data.to = scValToString(items[1], xdr)
        data.amount = scValToString(items[2], xdr)
        break
      case 'tokens_burned':
        data.tokenAddress = scValToString(items[0], xdr)
        data.from = scValToString(items[1], xdr)
        data.amount = scValToString(items[2], xdr)
        break
      case 'metadata_set':
        data.tokenAddress = scValToString(items[0], xdr)
        data.metadataUri = scValToString(items[1], xdr)
        break
      case 'fees_updated':
        data.baseFee = scValToString(items[0], xdr)
        data.metadataFee = scValToString(items[1], xdr)
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

// ── StellarService ────────────────────────────────────────────────────────────

export class StellarService {
  async deployToken(params: unknown): Promise<unknown> {
    console.log('Deploying token:', params)
    return { success: true }
  }

  /**
   * Fetch token info by scanning factory contract events for the given token address.
   * Falls back to a stub if the factory contract ID is not configured.
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) {
      // No factory contract configured — return a minimal stub so the UI can still render
      return {
        name: 'Unknown',
        symbol: '???',
        decimals: 7,
        totalSupply: '0',
        creator: '',
        metadataUri: undefined,
      }
    }

    // Fetch all relevant events for this token from the factory contract
    const { events } = await this.getContractEvents(contractId, 100)

    const tokenEvents = events.filter(
      (e) => e.data.tokenAddress === tokenAddress,
    )

    if (!tokenEvents.length) {
      throw new Error(`Token not found: ${tokenAddress}`)
    }

    const creationEvent = tokenEvents.find((e) => e.type === 'token_created')
    const metadataEvent = [...tokenEvents]
      .filter((e) => e.type === 'metadata_set')
      .sort((a, b) => b.ledger - a.ledger)[0]

    // Tally minted vs burned to derive total supply
    let supply = 0n
    for (const e of tokenEvents) {
      if (e.type === 'tokens_minted') supply += BigInt(e.data.amount ?? '0')
      if (e.type === 'tokens_burned') supply -= BigInt(e.data.amount ?? '0')
    }

    return {
      name: tokenAddress, // real name requires a contract view call; use address as fallback
      symbol: '—',
      decimals: 7,
      totalSupply: supply.toString(),
      creator: creationEvent?.data.creator ?? '',
      createdAt: creationEvent?.timestamp,
      metadataUri: metadataEvent?.data.metadataUri,
    }
  }

  async getTransaction(hash: string): Promise<unknown> {
    console.log('Getting transaction:', hash)
    return {}
  }

  /**
   * Fetch contract events for the factory contract, newest-first.
   * @param contractId  Soroban contract address (C...)
   * @param limit       Max events per page (default 20)
   * @param cursor      Opaque pagination cursor from a previous call
   */
  async getContractEvents(
    contractId: string,
    limit = 20,
    cursor?: string,
  ): Promise<GetEventsResult> {
    const params: Record<string, unknown> = {
      filters: [
        {
          type: 'contract',
          contractIds: [contractId],
        },
      ],
      pagination: {
        limit,
        ...(cursor ? { cursor } : {}),
      },
    }

    const result = await rpcCall<RpcGetEventsResult>('getEvents', params)

    const parsed = await Promise.all(result.events.map(parseRpcEvent))
    const events = parsed
      .filter((e): e is ContractEvent => e !== null)
      .sort((a, b) => b.ledger - a.ledger) // newest-first

    const lastEvent = result.events[result.events.length - 1]
    const nextCursor = lastEvent?.pagingToken ?? null

    return { events, cursor: nextCursor }
  }
}

export const stellarService = new StellarService()
