import React, { useState } from 'react'
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
import { formatEther } from '@ethersproject/units'

import { useEagerConnect, useInactiveListener, useShowUnhandledErrors } from './hooks'
import { getWallet, injected, ledger, MAINNET, mnemonicToPk, trezor, walletconnect } from './connectors'
import { Spinner } from './components/Spinner'
import { AbstractConnector } from '@web3-react/abstract-connector'
import { PrivateKeyConnector } from './private-key-connector'
import { ExternalProvider, JsonRpcFetchFunc } from '@ethersproject/providers/src.ts/web3-provider'
import { Web3ReactContextInterface } from '../../packages/core/src/types'
import { BigNumber } from '@ethersproject/bignumber'

const connectors = {
  injected,
  walletconnect,
  ledger,
  trezor,
} as const

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

function ChainId() {
  const { chainId } = useWeb3React()

  return (
    <>
      <span>Chain Id</span>
      <span role="img" aria-label="chain">
        ⛓
      </span>
      <span>{chainId ?? ''}</span>
    </>
  )
}

function BlockNumber() {
  const { chainId, library } = useWeb3React<Web3Provider>()

  const [blockNumber, setBlockNumber] = React.useState<number | null>()
  React.useEffect(() => {
    if (library) {
      let stale = false

      library
        .getBlockNumber()
        .then((blockNumber: number) => {
          if (!stale) {
            setBlockNumber(blockNumber)
          }
        })
        .catch(() => {
          if (!stale) {
            setBlockNumber(null)
          }
        })

      const updateBlockNumber = (blockNumber: number) => {
        setBlockNumber(blockNumber)
      }
      library.on('block', updateBlockNumber)

      return () => {
        stale = true
        library.removeListener('block', updateBlockNumber)
        setBlockNumber(undefined)
      }
    }
  }, [library, chainId]) // ensures refresh if referential identity of library doesn't change across chainIds

  return (
    <>
      <span>Block Number</span>
      <span role="img" aria-label="numbers">
        🔢
      </span>
      <span>{blockNumber === null ? 'Error' : blockNumber ?? ''}</span>
    </>
  )
}

function Account() {
  const { account } = useWeb3React()

  return (
    <>
      <span>Account</span>
      <span role="img" aria-label="robot">
        🤖
      </span>
      <span>
        {account === null
          ? '-'
          : account
          ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
          : ''}
      </span>
    </>
  )
}

function Balance() {
  const { account, library, chainId } = useWeb3React<Web3Provider>()

  const [balance, setBalance] = React.useState<BigNumber | null>()
  React.useEffect(() => {
    if (account && library) {
      let stale = false

      library
        .getBalance(account)
        .then((balance) => {
          if (!stale) {
            setBalance(balance)
          }
        })
        .catch(() => {
          if (!stale) {
            setBalance(null)
          }
        })

      return () => {
        stale = true
        setBalance(undefined)
      }
    }
  }, [account, library, chainId]) // ensures refresh if referential identity of library doesn't change across chainIds

  return (
    <>
      <span>Balance</span>
      <span role="img" aria-label="gold">
        💰
      </span>
      <span>{balance === null ? 'Error' : balance ? `Ξ${formatEther(balance)}` : ''}</span>
    </>
  )
}

function Header() {
  const { active, error } = useWeb3React()

  return (
    <>
      <h1>{active ? '🟢' : error ? '🔴' : '🟠'}</h1>
      <h3>
        <ChainId />
        <BlockNumber />
        <Account />
        <Balance />
      </h3>
    </>
  )
}

function KillSessionButton({ connector }: { connector?: AbstractConnector }) {
  if (connector instanceof WalletConnectConnector) {
    const name = Object.entries(connectors).find(([, c]) => c === connector)![0]
    return <button onClick={() => connector.close()}>Kill {name} Session</button>
  } else {
    return null
  }
}

function signMessageButton(library: Web3Provider | undefined, account: string | null | undefined) {
  return (
    <>
      {library && account && (
        <button
          onClick={() => {
            library
              .getSigner(account)
              .signMessage('👋')
              .then((signature) => {
                window.alert(`Success!\n\n${signature}`)
              })
              .catch((error) => {
                window.alert('Failure!' + (error && error.message ? `\n\n${error.message}` : ''))
              })
          }}
        >
          Sign Message
        </button>
      )}
    </>
  )
}

type ConnectButtonArgs = {
  activatingConnector?: AbstractConnector
  triedEager: boolean
  setActivatingConnector: (c: AbstractConnector) => void
} & Pick<Web3ReactContextInterface<Web3Provider>, 'connector' | 'error' | 'activate'>

function ConnectNetworkButton({
  activatingConnector,
  connector,
  triedEager,
  error,
  setActivatingConnector,
  activate,
}: ConnectButtonArgs) {
  return ([name, currentConnector]: [string, AbstractConnector]) => {
    const activating = currentConnector === activatingConnector
    const connected = currentConnector === connector
    const disabled = !!(!triedEager || activatingConnector || connected || error)

    return (
      <button
        disabled={disabled}
        key={name}
        onClick={() => {
          setActivatingConnector(currentConnector)
          activate(currentConnector)
        }}
      >
        <div>
          {activating && <Spinner color={'black'} />}
          {connected && <span role="img" aria-label="check" />}
        </div>
        {name}
      </button>
    )
  }
}

function ConnectMnemonicButton({
  activatingConnector,
  connector,
  triedEager,
  error,
  setActivatingConnector,
  activate,
}: ConnectButtonArgs) {
  const [mnemonic, setMnemonic] = useState('')
  const [password, setPassword] = useState('')
  const activating = activatingConnector instanceof PrivateKeyConnector
  const connected = connector instanceof PrivateKeyConnector
  const disabled = !!(!triedEager || activatingConnector || connected || error)

  return (
    <div>
      <textarea value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} placeholder="Mnemonic" />

      <div>
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button
          disabled={disabled}
          onClick={() => {
            const privateKey = mnemonicToPk(mnemonic, password)
            const c = new PrivateKeyConnector({
              privateKey,
              ...MAINNET,
            })
            setActivatingConnector(c)
            activate(c)
          }}
        >
          <div>
            {activating && <Spinner color={'black'} />}
            {connected && <span role="img" aria-label="check" />}
          </div>
          mnemonic
        </button>
      </div>
    </div>
  )
}

function ConnectKeyStoreButton({
  activatingConnector,
  connector,
  triedEager,
  error,
  setActivatingConnector,
  activate,
}: ConnectButtonArgs) {
  const [selectedFile, setSelectedFile] = useState('')
  const [password, setPassword] = useState('')
  const activating = activatingConnector instanceof PrivateKeyConnector
  const connected = connector instanceof PrivateKeyConnector
  const disabled = !!(!triedEager || activatingConnector || connected || error)

  return (
    <div>
      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={({ target: { value } }) => setPassword(value)}
      />
      <label htmlFor="file" id="file">
        Choose keystore
      </label>
      <input
        type="file"
        disabled={disabled}
        value={selectedFile}
        onChange={(event) => {
          event.preventDefault()
          setSelectedFile(event.target.value)
          event.target
            .files![0].text()
            .then((text) => JSON.parse(text))
            .then((o) => getWallet(o as any, password))
            .then((wallet) => wallet.getPrivateKeyString())
            .then((privateKey) => {
              const c = new PrivateKeyConnector({
                privateKey: privateKey.replace(/^0x/, ''),
                ...MAINNET,
              })
              setActivatingConnector(c)
              activate(c)
            })
            .catch((e) => {
              setSelectedFile('')
              throw e
            })
        }}
      />
      <div>
        {activating && <Spinner color={'black'} />}
        {connected && <span role="img" aria-label="check" />}
      </div>
    </div>
  )
}

function ConnectPrivateKeyButton({
  activatingConnector,
  connector,
  triedEager,
  error,
  setActivatingConnector,
  activate,
}: ConnectButtonArgs) {
  const [privateKey, setPrivateKey] = useState('')
  const activating = activatingConnector instanceof PrivateKeyConnector
  const connected = connector instanceof PrivateKeyConnector
  const disabled = !!(!triedEager || activatingConnector || connected || error)

  return (
    <div>
      <input type="text" value={privateKey} onChange={({ target: { value } }) => setPrivateKey(value)} />
      <button
        disabled={disabled}
        onClick={() => {
          const c = new PrivateKeyConnector({
            privateKey: privateKey.replace(/^0x/, ''),
            ...MAINNET,
          })
          setActivatingConnector(c)
          activate(c)
        }}
      >
        <div>
          {activating && <Spinner color={'black'} />}
          {connected && <span role="img" aria-label="check" />}
        </div>
        private key
      </button>
    </div>
  )
}

function App() {
  const { connector, library, account, activate, deactivate, active, error } = useWeb3React<Web3Provider>()
  // handle logic to recognize the connector currently being activated
  const [activatingConnector, setActivatingConnector] = React.useState<AbstractConnector>()
  React.useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined)
    }
  }, [activatingConnector, connector])

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect()

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector)

  const connectButtonArgs = {
    activatingConnector,
    connector,
    triedEager,
    error,
    setActivatingConnector,
    activate,
  }

  return (
    <>
      <Header />
      <hr />
      <div>
        {Object.entries(connectors).map(ConnectNetworkButton(connectButtonArgs))}
        {ConnectPrivateKeyButton(connectButtonArgs)}
        {ConnectMnemonicButton(connectButtonArgs)}
        {ConnectKeyStoreButton(connectButtonArgs)}
      </div>
      <div>
        {(active || error) && (
          <button
            onClick={() => {
              deactivate()
            }}
          >
            Deactivate
          </button>
        )}

        {error && <h4>{getErrorMessage(error)}</h4>}
      </div>

      <hr />

      <div>
        {signMessageButton(library, account)}
        <KillSessionButton connector={connector} />
      </div>
    </>
  )
}
