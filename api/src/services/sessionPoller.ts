import { rpc } from '@stellar/stellar-sdk'
import { MARKETPLACE_CONTRACT_ID } from './confidential'

const sorobanServer = new rpc.Server('https://soroban-testnet.stellar.org')

export async function pollSessionEvents() {
  console.log('[Session Poller] Starting Soroban RPC event polling...')
  
  try {
    // Get latest ledger
    const latestLedger = await sorobanServer.getLatestLedger()
    
    // We poll the last 100 ledgers for SETT_SESS events
    const startLedger = Math.max(1, latestLedger.sequence - 100)
    
    const events = await sorobanServer.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [MARKETPLACE_CONTRACT_ID],
          topics: [
            // The topic array filters for the SETT_SESS event
            ['*', '*', '*', '*'] // In production, properly encode the symbol_short!("SETT_SESS") XDR here
          ]
        }
      ],
      limit: 100
    })

    for (const event of events.events) {
      // In a real application, we would decode the XDR here and update the DB
      // const decoded = decodeEventXDR(event.value.xdr)
      console.log(`[Session Poller] Found event in ledger ${event.ledger}`)
      // updateSessionStatusInDB(decoded.sessionId, 'SETTLED', decoded.providerAmount)
    }
  } catch (error) {
    console.error('[Session Poller] Error polling events:', error)
  }
}

// Set up periodic polling every 10 seconds
// setInterval(pollSessionEvents, 10000)
