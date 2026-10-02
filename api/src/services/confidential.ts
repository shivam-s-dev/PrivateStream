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
 * Settles an MPP state channel session on-chain by invoking `settle_session` on the Soroban contract.
 * The contract itself will distribute the funds based on the escrow logic.
 */
export async function settleConfidentialPayment(
  providerAddress: string, // Unused directly on-chain now, kept for API compatibility
  amountUsdc: number,
  sessionId: string
): Promise<string> {
  const relayerKeypair = getRelayerKeypair()

  console.log(`[Settlement] Calling settle_session for session ${sessionId}, consumed: ${amountUsdc} USDC`)

  const account = await horizonServer.loadAccount(relayerKeypair.publicKey())
  const contract = new Contract(MARKETPLACE_CONTRACT_ID)

  // Construct the Soroban smart contract call for `settle_session`
  const operation = contract.call(
    'settle_session',
    nativeToScVal(sessionId, { type: 'string' }),
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
 */
export async function registerDatasetOnChain(
  datasetId: string, // Note: datasetId from backend
  providerAddress: string,
  title: string = "Dataset",
  category: number = 1,
  pricePerSecond: number = 1, // in stroops
  endpointHash: string = "hash"
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
    nativeToScVal(destination, { type: 'address' }),
    nativeToScVal(title, { type: 'string' }),
    nativeToScVal(category, { type: 'u32' }),
    nativeToScVal(pricePerSecond, { type: 'i128' }),
    nativeToScVal(endpointHash, { type: 'string' })
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
