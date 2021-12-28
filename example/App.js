import React, { Component } from 'react';
import './App.css';
import Solflare from '../';
import { Transaction } from '@solana/web3.js';

export default class App extends Component {

  constructor (props) {
    super(props);

    this.solflare = new Solflare();
  }

  state = {
    connected: false
  }

  createTransaction = (publicKey) => {
    const transaction = new Transaction();
    transaction.recentBlockhash = '8sUFDJ1rRV478F2ExDLWpzrvY7Pr6LyM6K2kw7ipzmoS';
    transaction.feePayer = publicKey;
    return transaction;
  };

  handleDisconnected = () => {
    this.setState({ connected: false });
    this.solflare.removeAllListeners('disconnect');
  };

  handleConnect = async () => {
    try {
      await this.solflare.connect();

      this.solflare.on('disconnect', this.handleDisconnected);

      this.setState({ connected: true });
    } catch (e) {
      console.log(e);
    }
  };

  handleDisconnect = async () => {
    try {
      await this.solflare.disconnect();
    } catch (e) {
      console.log(e);
    }
  };

  handleSignTransaction = async () => {
    try {
      const tx = await this.solflare.signTransaction(this.createTransaction(this.solflare.publicKey));

      console.log(tx);
    } catch (e) {
      console.log(e);
    }
  };

  handleSignAllTransactions = async () => {
    try {
      const txs = await this.solflare.signAllTransactions([ this.createTransaction(this.solflare.publicKey), this.createTransaction(this.solflare.publicKey) ]);

      console.log(txs);
    } catch (e) {
      console.log(e);
    }
  };

  handleSignMessage = async () => {
    try {
      const signature = await this.solflare.signMessage((new TextEncoder()).encode('Test message'), 'utf8');

      console.log(signature);
    } catch (e) {
      console.log(e);
    }
  };

  render () {
    if (this.state.connected) {
      return (
        <div>
          <button onClick={this.handleSignTransaction}>Sign transaction</button>
          <br/>
          <button onClick={this.handleSignAllTransactions}>Sign all transactios</button>
          <br/>
          <button onClick={this.handleSignMessage}>Sign message</button>
          <br/>
          <button onClick={this.handleDisconnect}>Disconnect</button>
        </div>
      );
    }

    return (
      <button onClick={this.handleConnect}>Connect</button>
    );
  }

}
