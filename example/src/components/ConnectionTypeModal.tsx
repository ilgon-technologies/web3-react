import Modal from 'react-modal'
import React, { useState } from 'react'
import { getWallet, injected, ledger, MAINNET, mnemonicToPk, trezor, walletconnect } from '../connectors'
import { useWeb3React } from '@web3-react/core'
import { PrivateKeyConnector } from '../private-key-connector'

type SubModal = 'Private key' | 'Mnemonic' | 'Keystore'

function ConnectorsWithoutInputButtons({ setConnecting }: { setConnecting: (b: boolean) => void }) {
  const connectorsWithoutInput = {
    Injected: injected,
    WalletConnect: walletconnect,
    Ledger: ledger,
    Trezor: trezor,
  } as const
  const { activate } = useWeb3React()
  return (
    <>
      {Object.entries(connectorsWithoutInput).map(([name, connector]) => (
        <button
          key={name}
          onClick={() => {
            setConnecting(true)
            activate(connector)
          }}
        >
          {name}
        </button>
      ))}
    </>
  )
}

function ConnectorsWithInputButtons(setSubModal: (b: SubModal) => void) {
  return (['Private key', 'Mnemonic', 'Keystore'] as const).map((t) => (
    <button key={t} onClick={() => setSubModal(t)}>
      {t}
    </button>
  ))
}

function MnemonicModal({
  setSubModal,
  setConnecting,
}: {
  setSubModal: (s: SubModal | null) => void
  setConnecting: (c: boolean) => void
}) {
  const { activate } = useWeb3React()
  const [mnemonic, setMnemonic] = useState('')
  const [password, setPassword] = useState('')
  return (
    <div>
      <textarea value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} placeholder="Mnemonic" />
      <div>
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button
          onClick={() => {
            const privateKey = mnemonicToPk(mnemonic, password)
            const c = new PrivateKeyConnector({
              privateKey,
              ...MAINNET,
            })
            setSubModal(null)
            setConnecting(true)
            activate(c)
          }}
        >
          Connect
        </button>
      </div>
    </div>
  )
}

function KeystoreModal({
  setSubModal,
  setConnecting,
}: {
  setSubModal: (s: SubModal | null) => void
  setConnecting: (c: boolean) => void
}) {
  const { activate } = useWeb3React()
  const [selectedFile, setSelectedFile] = useState('')
  const [password, setPassword] = useState('')
  return (
    <Modal isOpen={true} onRequestClose={() => setSubModal(null)} ariaHideApp={false}>
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
              setSubModal(null)
              setConnecting(true)
              activate(c)
            })
            .catch((e) => {
              setSelectedFile('')
              throw e
            })
        }}
      />
    </Modal>
  )
}

function PrivateKeyModal({
  setSubModal,
  setConnecting,
}: {
  setSubModal: (s: SubModal | null) => void
  setConnecting: (c: boolean) => void
}) {
  const { activate } = useWeb3React()
  const [privateKey, setPrivateKey] = useState('')
  return (
    <Modal isOpen={true} onRequestClose={() => setSubModal(null)} ariaHideApp={false}>
      <input
        type="text"
        placeholder="Private key"
        value={privateKey}
        onChange={({ target: { value } }) => setPrivateKey(value)}
      />
      <button
        onClick={() => {
          const c = new PrivateKeyConnector({
            privateKey: privateKey.replace(/^0x/, ''),
            ...MAINNET,
          })
          setSubModal(null)
          setConnecting(true)
          activate(c)
        }}
      >
        Connect
      </button>
    </Modal>
  )
}

function SubModal(subModal: SubModal, setSubModal: (s: SubModal | null) => void, setConnecting: (c: boolean) => void) {
  switch (subModal) {
    case 'Keystore':
      return <KeystoreModal setSubModal={setSubModal} setConnecting={setConnecting} />
    case 'Mnemonic':
      return <MnemonicModal setSubModal={setSubModal} setConnecting={setConnecting} />
    case 'Private key':
      return <PrivateKeyModal setSubModal={setSubModal} setConnecting={setConnecting} />
  }
}

export default ({ close }: { close: () => void }) => {
  const [connecting, setConnecting] = useState(false)
  const [subModal, setSubModal] = useState<null | SubModal>(null)
  return (
    <Modal isOpen={true} onRequestClose={close} ariaHideApp={false}>
      {connecting ? (
        <>Connecting...</>
      ) : (
        <>
          <ConnectorsWithoutInputButtons setConnecting={setConnecting} />
          {ConnectorsWithInputButtons(setSubModal)}
          {subModal && SubModal(subModal, setSubModal, setConnecting)}
        </>
      )}
    </Modal>
  )
}
