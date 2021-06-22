import { InjectedConnector } from '@web3-react/injected-connector'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { LedgerConnector } from '@web3-react/ledger-connector'
import { TrezorConnector } from '@web3-react/trezor-connector'
import HDKey from 'hdkey'
import * as bip39 from 'bip39'
import Wallet, { thirdparty } from 'ethereumjs-wallet'

function toHexStr(uint8Arr: Uint8Array) {
  return Buffer.from(uint8Arr).toString('hex')
}

export function mnemonicToPk(mnemonic: string, password: string) {
  const basePath = "m/44'/60'/0'/0"
  const index = 0
  const hdKey = HDKey.fromMasterSeed(bip39.mnemonicToSeedSync(mnemonic, password))
  return toHexStr(hdKey.derive(basePath + '/' + index).privateKey)
}

const mapKeys = (f: (s: string) => string) => <V>(r: Record<string, V>) =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [f(k), v]))

const fromMyEtherWalletV2 = json => {
  if (json.privKey.length !== 64) {
    throw new Error('Invalid private key length')
  }
  return new Wallet(new Buffer(json.privKey, 'hex'))
}

export async function getWallet(jsonfile: Record<string, unknown>, password: string) {
  jsonfile = mapKeys(k => k.toLowerCase())(jsonfile)
  const ilvalidWalletFile = new Error('Invalid Wallet file')
  if (!jsonfile) {
    throw ilvalidWalletFile
  }
  if (jsonfile.encseed != null) {
    return Wallet.fromEthSale(jsonfile as any, password)
  } else if (jsonfile.crypto != null) {
    return Wallet.fromV3(jsonfile as any, password, true)
  } else if (jsonfile.hash != null) {
    return thirdparty.fromEtherWallet(jsonfile as any, password)
  } else if (jsonfile.publisher == 'MyEtherWallet') {
    return fromMyEtherWalletV2(jsonfile)
  } else {
    throw ilvalidWalletFile
  }
}

const POLLING_INTERVAL = 12000
const RPC_URLS: { [chainId: number]: string } = {
  1: process.env.RPC_URL_1 as string,
  4: process.env.RPC_URL_4 as string
}

export const injected = new InjectedConnector({ supportedChainIds: [1, 3, 4, 5, 42] })

export const walletconnect = new WalletConnectConnector({
  rpc: { 1: RPC_URLS[1], 4: RPC_URLS[4] },
  qrcode: true,
  pollingInterval: POLLING_INTERVAL
})

export const ledger = new LedgerConnector({ chainId: 1, url: RPC_URLS[1], pollingInterval: POLLING_INTERVAL })

export const trezor = new TrezorConnector({
  chainId: 1,
  url: RPC_URLS[1],
  pollingInterval: POLLING_INTERVAL,
  manifestEmail: 'dummy@abc.xyz',
  manifestAppUrl: 'http://localhost:1234'
})
