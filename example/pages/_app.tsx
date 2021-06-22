import App from 'next/app'
import Head from 'next/head'

import '../styles.css'

export default class Root extends App {
  componentDidMount() {
    const showError = alert
    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      showError(e.reason.message)
    })
    window.onerror = function myErrorHandler(errorMsg) {
      showError(errorMsg)
      return false
    }
  }

  render() {
    const { Component } = this.props

    return (
      <>
        <Head>
          <title>web3-react example</title>
        </Head>

        <Component />
      </>
    )
  }
}
