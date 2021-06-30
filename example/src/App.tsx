import React, { useEffect, useState } from 'react'
import { UnsupportedChainIdError, useWeb3React, Web3ReactProvider } from '@web3-react/core'
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from '@web3-react/injected-connector'
import {
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
  WalletConnectConnector,
} from '@web3-react/walletconnect-connector'
import { Web3Provider } from '@ethersproject/providers'

import { useEagerConnect, useInactiveListener, useShowUnhandledErrors } from './hooks'
import { ExternalProvider, JsonRpcFetchFunc } from '@ethersproject/providers/src.ts/web3-provider'
import Connected from './components/Connected'
import ConnectionTypeModal from './components/ConnectionTypeModal'

function getErrorMessage(error: Error) {
  if (error instanceof NoEthereumProviderError) {
    return 'No Ethereum browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.'
  } else if (error instanceof UnsupportedChainIdError) {
    return "You're connected to an unsupported network."
  } else if (
    error instanceof UserRejectedRequestErrorInjected ||
    error instanceof UserRejectedRequestErrorWalletConnect
  ) {
    return 'Please authorize this website to access your Ethereum account.'
  } else {
    console.error(error)
    return 'An unknown error occurred. Check the console for more details.'
  }
}

function getLibrary(provider: ExternalProvider | JsonRpcFetchFunc): Web3Provider {
  const library = new Web3Provider(provider)
  library.pollingInterval = 12000
  return library
}

export default function () {
  useShowUnhandledErrors()
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <App />
    </Web3ReactProvider>
  )
}

function DisconnectButton() {
  const { connector, deactivate } = useWeb3React()
  return (
    <button
      onClick={() => {
        if (connector instanceof WalletConnectConnector) {
          // todo disconnect without showing the qr code stuff again
          // this may help https://github.com/WalletConnect/walletconnect-monorepo/issues/436
          connector.walletConnectProvider.disconnect()
        } else {
          deactivate()
        }
      }}
    >
      Disconnect
    </button>
  )
}

function App() {
  const { active, error } = useWeb3React<Web3Provider>()

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect()

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager)

  const [showConnectionTypeModal, setShowConnectionTypeModal] = useState(false)

  useEffect(() => {
    if (active || error) {
      setShowConnectionTypeModal(false)
    }
  }, [active, error])

  return (
    <>
      {active ? (
        <>
          <DisconnectButton />
          <Connected />
        </>
      ) : (
        <>
          <button onClick={() => setShowConnectionTypeModal(true)}>Connect</button>
          {error && <h4>{getErrorMessage(error)}</h4>}
          {showConnectionTypeModal && <ConnectionTypeModal close={() => setShowConnectionTypeModal(false)} />}
        </>
      )}
    </>
  )
}
