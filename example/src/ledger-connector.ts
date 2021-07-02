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
}

const ledgerEthereumClientFactoryAsync = async () => new Eth(await TransportWebUSB.create()) as LedgerEthereumClient

export class LedgerConnector extends AbstractConnector {
  private readonly chainId: number
  private readonly provider: Web3ProviderEngine
  private readonly subprovider: LedgerSubprovider

  constructor({ chainId, url }: LedgerConnectorArguments) {
    super({ supportedChainIds: [chainId] })
    this.chainId = chainId
    const [provider, subprovider] = (() => {
      const _provider = new Web3ProviderEngine()
      const _subprovider = new LedgerSubprovider({
        networkId: this.chainId,
        ledgerEthereumClientFactoryAsync,
      })
      _provider.addProvider(_subprovider)
      _provider.addProvider(new RPCSubprovider(url))
      return [_provider, _subprovider] as const
    })()
    this.provider = provider
    this.subprovider = subprovider
  }

  public async activate() {
    this.provider.start()
    return { provider: this.provider, chainId: this.chainId }
  }

  public async getProvider() {
    return this.provider
  }

  public async getChainId() {
    return this.chainId
  }

  public async getAccount() {
    return this.subprovider.getAccountsAsync(1).then(([account]) => account)
  }

  public deactivate() {
    this.provider.stop()
  }
}
