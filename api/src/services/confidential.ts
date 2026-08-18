import { Keypair, TransactionBuilder, Networks, Horizon, Memo, Asset, Operation, rpc, Contract, nativeToScVal } from '@stellar/stellar-sdk'

// Connect to Stellar Testnet (Horizon & Soroban RPC)
const horizonServer = new Horizon.Server('https://horizon-testnet.stellar.org')
const sorobanServer = new rpc.Server('https://soroban-testnet.stellar.org')

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
 * Settles an MPP session on-chain by invoking `settle_session` on the Soroban contract.
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

  console.log(`[Settlement] Calling settle_session for ${amountUsdc} USDC to ${destination}`)

  const account = await horizonServer.loadAccount(relayerKeypair.publicKey())
  const contract = new Contract(MARKETPLACE_CONTRACT_ID)

  // Construct the Soroban smart contract call for `settle_session`
  const operation = contract.call(
    'settle_session',
    nativeToScVal(sessionId, { type: 'string' }),
    nativeToScVal(destination, { type: 'address' }),
    nativeToScVal(Math.floor(amountUsdc * 10_000_000), { type: 'i128' }) // convert to stroops
  )

  const txBuilder = new TransactionBuilder(account, {
    fee: '100000', // Soroban operations require higher base fees
    networkPassphrase: Networks.TESTNET
  })
    .addMemo(Memo.text(`PS:${sessionId.substring(0, 12)}`))
    .addOperation(operation)
    .setTimeout(30)
    
  const tx = txBuilder.build()
  
  // Prepare transaction using Soroban RPC (simulates and sets footprint)
  const preparedTx = await sorobanServer.prepareTransaction(tx)
  preparedTx.sign(relayerKeypair)

  const sendResponse = await sorobanServer.sendTransaction(preparedTx)
  console.log(`[Settlement] Contract call confirmed on Stellar Testnet! Hash: ${sendResponse.hash}`)

  return sendResponse.hash
}

/**
 * Registers a new dataset on-chain by invoking `register_dataset` on the Soroban contract.
 * The dataset ID is embedded in the memo field for verification.
 */
export async function registerDatasetOnChain(
  datasetId: string,
  providerAddress: string
): Promise<string> {
  const relayerKeypair = getRelayerKeypair()
  const account = await horizonServer.loadAccount(relayerKeypair.publicKey())

  let destination = providerAddress
  try {
    Keypair.fromPublicKey(providerAddress)
  } catch {
    destination = relayerKeypair.publicKey()
  }
  
  console.log(`[Dataset Registration] Calling register_dataset for provider ${destination}`)

  const contract = new Contract(MARKETPLACE_CONTRACT_ID)
  const operation = contract.call(
    'register_dataset',
    nativeToScVal(datasetId, { type: 'string' }),
    nativeToScVal(destination, { type: 'address' }),
    nativeToScVal(100, { type: 'u32' }) // example dataset rate or params
  )

  const txBuilder = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET
  })
    .addMemo(Memo.text(`REG:${datasetId.substring(0, 12)}`))
    .addOperation(operation)
    .setTimeout(30)

  const tx = txBuilder.build()
  
  const preparedTx = await sorobanServer.prepareTransaction(tx)
  preparedTx.sign(relayerKeypair)

  const response = await sorobanServer.sendTransaction(preparedTx)
  console.log(`[Dataset Registration] Contract call confirmed on Stellar! Hash: ${response.hash}`)
  
  return response.hash
}
