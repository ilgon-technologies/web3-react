import { ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import Web3ProviderEngine from 'web3-provider-engine'
import { RPCSubprovider } from '@0x/subproviders/lib/src/subproviders/rpc_subprovider' // https://github.com/0xProject/0x-monorepo/issues/1400
import { PrivateKeyWalletSubprovider } from '@0x/subproviders/lib/src/subproviders/private_key_wallet'
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js');


/**
 * based on TrezorConnector and
 * influenced by https://github.com/NoahZinsmeister/web3-react/issues/35#issuecomment-558324930
 */
export class PrivateKeyConnector extends AbstractConnector {
  private readonly chainId: number
  private readonly provider: Web3ProviderEngine
  private readonly pkSubprovider: PrivateKeyWalletSubprovider

  constructor({
    chainId,
    url,
    pollingInterval,
    requestTimeoutMs,
    privateKey
  }: {
    chainId: number
    url: string
    pollingInterval?: number
    requestTimeoutMs?: number
    privateKey: string
  }) {
    super({ supportedChainIds: [chainId] })
    this.chainId = chainId
    this.provider = new Web3ProviderEngine({ pollingInterval })
    this.pkSubprovider = new PrivateKeyWalletSubprovider(privateKey, this.chainId)
    this.provider.addProvider(this.pkSubprovider)
    this.provider.addProvider(new CacheSubprovider())
    this.provider.addProvider(new RPCSubprovider(url, requestTimeoutMs))
  }

  public async activate(): Promise<ConnectorUpdate> {
    this.provider.start()
    return { provider: this.provider, chainId: this.chainId }
  }

  public async getProvider(): Promise<Web3ProviderEngine> {
    return this.provider
  }

  public async getChainId(): Promise<number> {
    return this.chainId
  }

  public async getAccount(): Promise<string> {
    return this.pkSubprovider.getAccountsAsync().then(accounts => accounts[0])
  }

  public deactivate() {
    this.provider.stop()
  }
}
