import { useWeb3React } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import React, { useEffect, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'

import { ethers } from 'ethers'
import stakingAbi from '../stakingAbi'
import { MAINNET } from '../connectors'

function Header() {
  function ChainId() {
    const { chainId } = useWeb3React()

    return (
      <div>
        <span>Chain Id</span>
        <span role="img" aria-label="chain">
          ⛓
        </span>
        <span>{chainId ?? ''}</span>
      </div>
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
      <div>
        <span>Block Number</span>
        <span role="img" aria-label="numbers">
          🔢
        </span>
        <span>{blockNumber === null ? 'Error' : blockNumber ?? ''}</span>
      </div>
    )
  }

  function Account() {
    const { account } = useWeb3React()

    return (
      <div>
        <span>Account</span>
        <span role="img" aria-label="robot">
          🤖
        </span>
        <span>{account === null ? '-' : account}</span>
      </div>
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
      <div>
        <span>Balance</span>
        <span role="img" aria-label="gold">
          💰
        </span>
        <span>{balance === null ? 'Error' : balance ? `Ξ${formatEther(balance)}` : ''}</span>
      </div>
    )
  }
  return (
    <h3>
      <ChainId />
      <BlockNumber />
      <Account />
      <Balance />
    </h3>
  )
}

function SignMessageButton() {
  const { library, account } = useWeb3React<Web3Provider>()
  return (
    <>
      {library && account && (
        <button
          onClick={() => {
            library
              .getSigner(account)
              .signMessage('👋')
              .then((signature) => window.alert(`Success!\n\n${signature}`))
              .catch((error) => window.alert('Failure!' + (error && error.message ? `\n\n${error.message}` : '')))
          }}
        >
          Sign Message
        </button>
      )}
    </>
  )
}

function ShowNumberOfVaults({ stakingContract }: { stakingContract: ethers.Contract }) {
  const { account } = useWeb3React<Web3Provider>()

  const [vaults, setVaults] = useState<number | null>(null)

  useEffect(
    () => stakingContract.getVaultsLength(account).then((len: ethers.BigNumber) => setVaults(len.toNumber())),
    [account, stakingContract]
  )

  return <div>Number of vaults is: {vaults}</div>
}

function StakeButton() {
  return <button onClick={() => {}}>Stake 1 eth</button>
}

export default () => {
  const { library, chainId } = useWeb3React<Web3Provider>()
  const [stakingContract, setStakingContract] = useState<ethers.Contract | null>(null)
  useEffect(
    () =>
      setStakingContract(
        chainId === MAINNET.chainId
          ? new ethers.Contract('0x933cdac7b0bD9519C84e8F1F74Be51b07921e596', stakingAbi, library!.getSigner())
          : null
      ),
    [library, chainId]
  )
  return (
    <>
      <Header />
      <SignMessageButton />
      {stakingContract && <ShowNumberOfVaults stakingContract={stakingContract} />}
    </>
  )
}
