import { Keypair, TransactionBuilder, Networks, Horizon, Memo, Asset, Operation } from '@stellar/stellar-sdk'

// Connect to Stellar Testnet (Horizon.Server is the correct class in stellar-sdk v16)
const server = new Horizon.Server('https://horizon-testnet.stellar.org')

// The deployed PrivateStream Marketplace contract on Stellar Testnet
export const MARKETPLACE_CONTRACT_ID = process.env.CONTRACT_MARKETPLACE || 'CDBD72VIJTM4QNV2MR3C3OBRQUHA56PSBFSUJFRHZBYUSUOCQ5TUUNBE'

// Backend settlement relayer — signs and submits the on-chain settlement tx
// Secret must be set in the SETTLEMENT_RELAYER_SECRET env variable
function getRelayerKeypair(): Keypair {
  const secret = process.env.SETTLEMENT_RELAYER_SECRET
  if (!secret) {
    throw new Error('SETTLEMENT_RELAYER_SECRET env variable is not set')
  }
  return Keypair.fromSecret(secret)
}

/**
 * Settles an MPP session on-chain by submitting a real Stellar Testnet transaction.
 * The session ID is embedded in the memo field for auditing.
 * Returns the confirmed transaction hash from the Stellar network.
 */
export async function settleConfidentialPayment(
  providerAddress: string,
  amountUsdc: number,
  sessionId: string
): Promise<string> {
  const relayerKeypair = getRelayerKeypair()

  // Validate the provider address — fall back to relayer self-payment if invalid (testnet only)
  let destination = providerAddress
  try {
    Keypair.fromPublicKey(providerAddress)
  } catch {
    console.warn(`[Settlement] Invalid provider address "${providerAddress}", routing payment to relayer for testnet demo.`)
    destination = relayerKeypair.publicKey()
  }

  console.log(`[Settlement] Settling ${amountUsdc} USDC to ${destination} for session ${sessionId}`)

  const account = await server.loadAccount(relayerKeypair.publicKey())

  // Clamp the amount: Stellar requires ≥ 0.0000001 XLM (testnet demo uses native XLM to simulate USDC flow)
  const amountStr = Math.max(0.0000001, amountUsdc).toFixed(7)

  const tx = new TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase: Networks.TESTNET
  })
    // Embed the session ID as a memo so any explorer can trace this tx back to the session
    .addMemo(Memo.text(`PS:${sessionId.substring(0, 12)}`))
    .addOperation(Operation.payment({
      destination,
      asset: Asset.native(), // testnet demo; production would use the USDC/Circle asset
      amount: amountStr,
    }))
    .setTimeout(30)
    .build()

  tx.sign(relayerKeypair)

  const response = await server.submitTransaction(tx)
  console.log(`[Settlement] Confirmed on Stellar Testnet! Hash: ${response.hash}`)

  return response.hash
}
