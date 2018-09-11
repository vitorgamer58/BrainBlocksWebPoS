import React, { Component, Fragment } from 'react'
import { css } from 'react-emotion'
import axios from 'axios'
import config from 'config'
import currencies from 'constants/currencies'
import theme from 'theme'
import { convert } from 'functions/calculator'
import { isValidNanoAddress, raiToNano } from 'functions/nano'
import Dashboard from 'components/dashboard/Dashboard'
import Calculator from 'components/calculator/Calculator'
import Modal from 'components/modal/Modal'
import AddressForm from 'components/forms/AddressForm'
import CurrencyForm from 'components/forms/CurrencyForm'
import TransactionInfo from 'components/transactions/TransactionInfo'

const getStyles = props => {
  return {
    container: css`
      background: white;
      min-height: 100vh;
      max-width: ${theme.bp.fullWidth}px;
      max-height: ${theme.bp.fullHeight}px;
      box-shadow: 10px 10px 120px rgba(0, 0, 0, 0.2);
      margin: auto;
      width: 100%;
      position: relative;
      @media (min-height: ${theme.bp.fullHeight}px) {
        min-height: ${theme.bp.fullHeight}px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    `
  }
}

class App extends Component {
  constructor(props) {
    super(props)

    const address = window.localStorage['bb_pos_address'] || ''
    const currencyCode = window.localStorage['bb_pos_currencycode'] || 'usd'

    this.state = {
      address,
      currencyCode,
      transactions: [],
      txRequestStatus: 'waiting',
      openPanel: 'dashboard',
      openModal: '',
      addressFieldValue: address,
      currencyFieldValue: currencyCode,
      currencyNanoPrice: 0,
      transactionModalIndex: 0
    }
  }

  componentDidMount = () => {
    this.getNanoPrice()
    this.getTransactions()
    this.refresher = setInterval(() => {
      this.getNanoPrice()
      this.getTransactions()
    }, 30000)
  }

  componentWillUnmount = () => {
    clearInterval(this.refresher)
  }

  getTransactions = () => {
    this.setState({ txRequestStatus: 'waiting' }, () => {
      axios
        .get(`${config.endpoints.getTransactions}/${this.state.address}`)
        .then(res => {
          this.setState({ transactions: res.data.transactions, txRequestStatus: 'done' })
        })
        .catch(e => {
          console.error("Couldn't get transactions", e)
          this.setState({ txRequestStatus: 'failed' })
        })
    })
  }

  getNanoPrice = () => {
    axios
      .get(`${config.endpoints.getPrice}/${this.state.currencyCode}/1/rai`)
      .then(res => {
        this.setState({ currencyNanoPrice: convert(1, 'fiat', raiToNano(res.data.rai)) })
      })
      .catch(e => {
        console.error("Couldn't get price", e)
        this.setState({ txRequestStatus: 'failed' })
      })
  }

  isAddressFieldValid = () => {
    return isValidNanoAddress(this.state.addressFieldValue)
  }

  getHandleSwitchPanel = panel => () => {
    this.setState({
      openPanel: panel
    })
  }

  handleUpdateAddressField = event => {
    this.setState({
      addressFieldValue: event.target.value
    })
  }

  handleUpdateCurrencyField = event => {
    this.setState({
      currencyFieldValue: event.target.value
    })
  }

  handleSetAddress = () => {
    window.localStorage['bb_pos_address'] = this.state.addressFieldValue
    this.setState(
      {
        address: this.state.addressFieldValue,
        openModal: ''
      },
      this.getTransactions
    )
  }

  handleSetCurrency = code => {
    code = code || this.state.currencyFieldValue
    window.localStorage['bb_pos_currencycode'] = code
    this.setState(
      {
        currencyCode: code,
        openModal: ''
      },
      this.getNanoPrice
    )
  }

  handleOpenModal = modal => () => {
    this.setState({
      openModal: modal
    })
  }

  handleCloseModal = () => {
    this.setState({
      openModal: ''
    })
  }

  handleInspectTransaction = txId => {
    this.setState({
      openModal: 'transaction',
      transactionModalIndex: txId
    })
  }

  render() {
    const classes = getStyles(this.props)

    return (
      <Fragment>
        <div className={classes.container}>
          {this.state.openPanel === 'dashboard' && (
            <Dashboard
              currencies={this.state.currencies}
              transactions={this.state.transactions}
              currencyCode={this.state.currencyCode}
              posEnabled={isValidNanoAddress(this.state.address)}
              onOpenModal={this.handleOpenModal}
              onOpenPoS={this.getHandleSwitchPanel('pos')}
              onInspectTransaction={this.handleInspectTransaction}
              txRequestStatus={this.state.txRequestStatus}
              onGetTransactions={this.getTransactions}
            />
          )}
          {this.state.openPanel === 'pos' && (
            <Calculator
              address={this.state.address}
              currencyCode={this.state.currencyCode}
              currencyNanoPrice={this.state.currencyNanoPrice}
              onBack={this.getHandleSwitchPanel('dashboard')}
              getTransactions={this.getTransactions}
            />
          )}
        </div>
        {this.state.openModal === 'currency' && (
          <Modal onClose={this.handleCloseModal}>
            <CurrencyForm
              currencies={currencies}
              currencyFieldValue={this.state.currencyFieldValue}
              onUpdateCurrency={this.handleUpdateCurrencyField}
              onSaveCurrency={this.handleSetCurrency}
            />
          </Modal>
        )}
        {this.state.openModal === 'address' && (
          <Modal onClose={this.handleCloseModal}>
            <AddressForm
              addressFieldValue={this.state.addressFieldValue}
              addressFieldValid={this.isAddressFieldValid()}
              onUpdateAddress={this.handleUpdateAddressField}
              onSaveAddress={this.handleSetAddress}
            />
          </Modal>
        )}
        {this.state.openModal === 'transaction' && (
          <Modal onClose={this.handleCloseModal}>
            {this.state.transactions.length >= 1 && (
              <TransactionInfo
                transaction={this.state.transactions[this.state.transactionModalIndex]}
                currencyCode={this.state.currencyCode}
              />
            )}
          </Modal>
        )}
      </Fragment>
    )
  }
}

export default App
