/* eslint no-console:0 */
/* global QRLLIB, XMSS_OBJECT, LocalStore, QrlLedger, isElectrified, selectedNetwork,loadAddressTransactions, getTokenBalances, updateBalanceField, refreshTransferPage */
/* global pkRawToB32Address, hexOrB32, rawToHexOrB32, anyAddressToRawAddress, stringToBytes, binaryToBytes, bytesToString, bytesToHex, hexToBytes, toBigendianUint64BytesUnsigned, numberToString, decimalToBinary */
/* global getMnemonicOfFirstAddress, getXMSSDetails, isWalletFileDeprecated, waitForQRLLIB, addressForAPI, binaryToQrlAddress, toUint8Vector, concatenateTypedArrays, getQrlProtoShasum */
/* global resetWalletStatus, passwordPolicyValid, countDecimals, supportedBrowser, wrapMeteorCall, getBalance, otsIndexUsed, ledgerHasNoTokenSupport, resetLocalStorageState, nodeReturnedValidResponse */
/* global POLL_TXN_RATE, POLL_MAX_CHECKS, DEFAULT_NETWORKS, findNetworkData, SHOR_PER_QUANTA, WALLET_VERSION, QRLPROTO_SHA256,  */

import JSONFormatter from 'json-formatter-js'
import './tx.html'

Template.appVerifyTxid.onRendered(() => {
  this.$('.value').popup()

  Session.set('txhash', {})
  Session.set('qrlValue', {})
  Session.set('status', {})

  const thisTxId = FlowRouter.getParam('txId')
  const request = {
    query: thisTxId,
    network: selectedNetwork(),
  }

  if (thisTxId && thisTxId.length === 64) {
    wrapMeteorCall('txhash', request, (err, res) => {
      if (err) {
        console.log(err)
        Session.set('txhash', { error: err.message, id: thisTxId })
      } else {
        Session.set('txhash', res)
      }
    })

    Meteor.call('QRLvalue', (err, res) => {
      if (err) {
        Session.set('qrlValue', 'Error getting value from API')
      } else {
        Session.set('qrlValue', res)
      }
    })

    wrapMeteorCall('status', { network: request.network }, (err, res) => {
      if (err) {
        Session.set('status', { error: err })
      } else {
        Session.set('status', res)
      }
    })
  }
  if (thisTxId.length !== 64) {
    Session.set('txhash', { error: 'Invalif txhash', id: thisTxId })
  }
})


Template.appVerifyTxid.helpers({
  hasMessage() {
    try {
      if (this.tx.transfer.message_data.length > 0) {
        return true
      }
      return false
    } catch (e) {
      return false
    }
  },
  tfMessage() {
    return this.tx.transfer.message_data
  },
  tx() {
    try {
      const txhash = Session.get('txhash').transaction
      return txhash
    } catch (e) {
      return false
    }
  },
  bech32() {
    if (Session.get('addressFormat') === 'bech32') {
      return true
    }
    return false
  },
  notFound() {
    if (Session.get('txhash').found === false) {
      return true
    }
    return false
  },
  header() {
    return Session.get('txhash').transaction.header
  },
  qrl() {
    const txhash = Session.get('txhash')
    try {
      const value = txhash.transaction.tx.amount
      const x = Session.get('qrlValue')
      const y = Math.round((x * value) * 100) / 100
      if (y !== 0) { return y }
    } catch (e) {
      return '...'
    }
    return '...'
  },
  amount() {
    try {
      if (this.tx.coinbase) {
        return numberToString(this.tx.coinbase.amount / SHOR_PER_QUANTA)
      }
      if (this.tx.transactionType === 'transfer') {
        return `${numberToString(this.tx.transfer.totalTransferred)} Quanta`
      }
      if (this.tx.transactionType === 'transfer_token') {
        return `${numberToString(this.tx.transfer_token.totalTransferred)} ${this.tx.transfer_token.symbol}`
      }
      return ''
    } catch (e) {
      return false
    }
  },
  isConfirmed() {
    try {
      if (this.header.block_number !== null) {
        return true
      }
      return false
    } catch (e) {
      return false
    }
  },
  confirmations() {
    const x = Session.get('status')
    try {
      return x.node_info.block_height - this.header.block_number
    } catch (e) {
      return 0
    }
  },
  ts() {
    const x = moment.unix(this.header.timestamp_seconds)
    return moment(x).format('HH:mm D MMM YYYY')
  },
  color() {
    try {
      if (this.tx.transactionType === 'coinbase') {
        return 'teal'
      }
      if (this.tx.transactionType === 'stake') {
        return 'red'
      }
      if (this.tx.transactionType === 'transfer') {
        return 'yellow'
      }
      return 'sky'
    } catch (e) {
      return false
    }
  },
  isToken() {
    try {
      if (this.explorer.type === 'CREATE TOKEN') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isTransfer() {
    try {
      if (this.explorer.type === 'TRANSFER') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isTokenTransfer() {
    try {
      if (this.explorer.type === 'TRANSFER TOKEN') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isNotCoinbase() {
    try {
      if (this.explorer.type !== 'COINBASE') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isMessage() {
    try {
      if (this.explorer.type === 'MESSAGE') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isDocumentNotarisation() {
    try {
      if (this.explorer.type === 'DOCUMENT_NOTARISATION') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isMultiSigCreateTxn() {
    try {
      if (this.explorer.type === 'MULTISIG_CREATE') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isMultiSigVoteTxn() {
    try {
      if (this.explorer.type === 'MULTISIG_VOTE') {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  isNotMessage() {
    try {
      if ((this.explorer.type !== 'MESSAGE') && (this.explorer.type !== 'DOCUMENT_NOTARISATION')) {
        return true
      }
    } catch (e) {
      return false
    }
    return false
  },
  nodeExplorerUrl() {
    if ((Session.get('nodeExplorerUrl') === '') || (Session.get('nodeExplorerUrl') === null)) {
      return DEFAULT_NETWORKS[0].explorerUrl
    }
    return Session.get('nodeExplorerUrl')
  },
  multiSigSignatories(ms) {
    const output = []
    if (ms) {
      _.each(ms.signatories, (item, index) => {
        output.push({ address_hex: `Q${item}`, weight: ms.weights[index] })
      })
      return output
    }
    return false
  },
})

Template.appVerifyTxid.events({
  'click .close': () => {
    $('.message').hide()
  },
  'click .jsonclick': () => {
    if (!($('.json').html())) {
      const myJSON = Session.get('txhash').transaction
      const formatter = new JSONFormatter(myJSON)
      $('.json').html(formatter.render())
    }
    $('.jsonbox').toggle()
  },
})
