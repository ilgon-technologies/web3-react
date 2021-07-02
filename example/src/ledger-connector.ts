import { ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import Web3ProviderEngine from 'web3-provider-engine'
import { LedgerSubprovider } from '@0x/subproviders/lib/src/subproviders/ledger' // https://github.com/0xProject/0x-monorepo/issues/1400
import { RPCSubprovider } from '@0x/subproviders/lib/src/subproviders/rpc_subprovider' // https://github.com/0xProject/0x-monorepo/issues/1400
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import Eth from '@ledgerhq/hw-app-eth'
import { LedgerEthereumClient } from '@0x/subproviders'

interface LedgerConnectorArguments {
  chainId: number
  url: string
  pollingInterval?: number
  requestTimeoutMs?: number
  accountFetchingConfigs?: any
  baseDerivationPath?: string
}

const ledgerEthereumClientFactoryAsync = async () => new Eth(await TransportWebUSB.create()) as LedgerEthereumClient

export class LedgerConnector extends AbstractConnector {
  private readonly chainId: number
  private readonly url: string

  private provider?: Web3ProviderEngine

  constructor({ chainId, url }: LedgerConnectorArguments) {
    super({ supportedChainIds: [chainId] })
    this.chainId = chainId
    this.url = url
  }
  public async activate(): Promise<ConnectorUpdate> {
    if (!this.provider) {
      const engine = new Web3ProviderEngine()
      engine.addProvider(
        new LedgerSubprovider({
          networkId: this.chainId,
          ledgerEthereumClientFactoryAsync,
        })
      )
      engine.addProvider(new RPCSubprovider(this.url))
      this.provider = engine
    }

    this.provider.start()

    return { provider: this.provider, chainId: this.chainId }
  }

  public async getProvider(): Promise<Web3ProviderEngine> {
    return this.provider!
  }

  public async getChainId(): Promise<number> {
    return this.chainId
  }

  public async getAccount(): Promise<null> {
    return (this.provider as any)._providers[0].getAccountsAsync(1).then((accounts: string[]): string => accounts[0])
  }

  public deactivate() {
    this.provider!.stop()
  }
}
