import React, { Component } from 'react';
import Solflare from '../';
import { Transaction, Connection } from '@solana/web3.js';

export default class App extends Component {

  constructor (props) {
    super(props);

    this.solflare = new Solflare();

    this.connection = new Connection('https://fittest-crimson-night.solana-mainnet.discover.quiknode.pro/ce5a19f97c9f96af9d395263ffb2bdba8ea007eb/', 'confirmed');
  }

  state = {
    connected: false
  }

  componentDidMount () {
    this.solflare.detectWallet().then((detected) => console.log('Wallet detected', detected));
  }

  createTransaction = async (publicKey) => {
    const transaction = new Transaction();
    // transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
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

      this.solflare.on('accountChanged', (publicKey) => {
        console.log('accountChanged', publicKey);
        if (!publicKey) {
          this.handleDisconnected();
        }
      });

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
      const tx = await this.solflare.signTransaction(await this.createTransaction(this.solflare.publicKey));

      document.body.append(JSON.stringify(tx));

      console.log(tx);
    } catch (e) {
      console.log(e);
    }
  };

  handleSignAllTransactions = async () => {
    try {
      const txs = await this.solflare.signAllTransactions([ await this.createTransaction(this.solflare.publicKey), await this.createTransaction(this.solflare.publicKey) ]);

      document.body.append(JSON.stringify(txs));

      console.log(txs);
    } catch (e) {
      console.log(e);
    }
  };

  handleSignMessage = async () => {
    try {
      const signature = await this.solflare.signMessage((new TextEncoder()).encode('Test message'), 'utf8');

      document.body.append(JSON.stringify(signature));

      console.log(signature);
    } catch (e) {
      console.log(e);
    }
  };

  handleSignAndSendTransaction = async () => {
    try {
      const tx = await this.solflare.signAndSendTransaction(await this.createTransaction(this.solflare.publicKey));

      document.body.append(JSON.stringify(tx));

      console.log(tx);
    } catch (e) {
      console.log(e);
    }
  }

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
          <br/>
          <button onClick={this.handleSignAndSendTransaction}>Sign and send transaction</button>
        </div>
      );
    }

    return (
      <button onClick={this.handleConnect}>Connect</button>
    );
  }

}
