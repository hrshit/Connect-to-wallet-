import { useState, useEffect } from 'react'
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import './App.css'
import { formatBalance, formatChainAsNum } from './utils'
import detectEthereumProvider from '@metamask/detect-provider'
import { Box, autocompleteClasses } from '@mui/material';
import { Buffer } from "buffer";
import { ethers } from 'ethers'
import counterDetails from "./abi/counter.json"




function App() {

  const [hasProvider, setHasProvider] = useState(null);
  const initialState = { accounts: [], balance: "", chainId: "" }
  const [wallet, setWallet] = useState(initialState)

  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [inputValue, setInputValue] = useState('');
  const [stateValue, setStateValue] = useState(0);
  const [counterContract, setCounterContract] = useState('');
  const [signer, setSigner] = useState('');



  useEffect(() => {
    const refreshAccounts = (accounts) => {
      if (accounts.length > 0) {
        updateWallet(accounts)
      } else {
        setWallet(initialState);
      }
    }
    const refreshChain = (chainId) => {
      setWallet((wallet) => ({ ...wallet, chainId }))
    }
    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true })
      setHasProvider(Boolean(provider)) // transform provider to true or false

      if (provider) {
        const accounts = await window.ethereum.request(
          { method: 'eth_accounts' }
        )
        const provider = new ethers.BrowserProvider(window.ethereum);// It will prompt user for account connections if it isnt connected
        const signer = await provider.getSigner();
        setSigner(signer)
        setCounterContract(new ethers.Contract(counterDetails.address, counterDetails.abi, signer))
        refreshAccounts(accounts)
        window.ethereum.on('accountsChanged', refreshAccounts)
        window.ethereum.on("chainChanged", refreshChain)
      }
    }
    getProvider()
    return () => {
      window.ethereum?.removeListener('accountsChanged', refreshAccounts)
      window.ethereum?.removeListener("chainChanged", refreshChain)
    }
  }, [])

  useEffect(() => {
    const getCount = async () => {
      if (signer)
        await readCount()
    }
    getCount()
  }, [signer])

  const readCount = async () => {
    const count = await counterContract.getCount();
    console.log("count value", ethers.toNumber(count));
    setStateValue(ethers.toNumber(count));
  }

  const updateWallet = async (accounts) => {
    const balance = formatBalance(await window.ethereum.request({
      method: "eth_getBalance",
      params: [accounts[0], "latest"],
    }));
    const chainId = await window.ethereum.request({                 /* New */
      method: "eth_chainId",                                         /* New */
    })
    setWallet({ accounts, balance, chainId })
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    await window.ethereum.request({
      method: "eth_requestAccounts",
    })
      .then((accounts) => {                            /* New */
        setError(false)                                   /* New */
        updateWallet(accounts)                            /* New */
      })                                                  /* New */
      .catch((err) => {                               /* New */
        setError(true)                                    /* New */
        setErrorMessage(err.message)                      /* New */
      })                                                  /* New */
    setIsConnecting(false)
  }

  /* for send transaction */

  const SendTransaction = async () => {
    await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: wallet.accounts[0],
          to: inputValue,
          value: '100000000000000', // 0.0001 ether
          gasLimit: '0x5028', // Customizable by the user during MetaMask confirmation.
          maxPriorityFeePerGas: '0x3b9aca00', // Customizable by the user during MetaMask confirmation.
          maxFeePerGas: '0x2540be400', // Customizable by the user during MetaMask confirmation.
        },
      ],
    })
      .then((txHash) => console.log(txHash))
      .catch((error) => console.error(error));
  }

  // Sign in with Ethereum

  const siweSign = async (siweMessage) => {
    try {
      const from = wallet.accounts[0];
      const msg = `0x${Buffer.from(siweMessage, 'utf8').toString('hex')}`;
      const sign = await ethereum.request({
        method: 'personal_sign',
        params: [msg, from],
      });
      siweResult.innerHTML = sign;
    } catch (err) {
      console.error(err);
      siweResult.innerHTML = `Error: ${err.message}`;
    }
  };

  const siwe = async () => {
    const domain = window.location.host;
    const from = wallet.accounts[0];
    const siweMessage = `${domain} wants you to sign in with your Ethereum account:\n${from}\n\nI accept the MetaMask Terms of Service: https://community.metamask.io/tos\n\nURI: https://${domain}\nVersion: 1\nChain ID: 1\nNonce: 32891757\nIssued At: 2021-09-30T16:25:24.000Z`;
    siweSign(siweMessage);
  };

  const increment = async () => {
    const populateTransaction = await counterContract.incrementCounter.populateTransaction();
    const transaction = await signer.sendTransaction(populateTransaction)
    const receipt = await transaction.wait()
    if (receipt.status)
      await readCount()
  }
  const decrement = async () => {
    const populateTransaction = await counterContract.decrementCounter.populateTransaction();
    const transaction = await signer.sendTransaction(populateTransaction)
    const receipt = await transaction.wait()
    if (receipt.status)
      await readCount()
  }
  return (
    <div className='App'>
      <h2 sx={{ ml: 10 }}> Injected Provider {hasProvider ? 'Does' : 'Does Not'} Exist</h2>
      {
        window.ethereum?.isMetaMask && wallet.accounts.length < 1 &&  /* Updated */
        <button onClick={handleConnect} variant="contained">Connect MetaMask</button>
      }
      {
        wallet.accounts.length > 0 &&
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              mx: 30
            }}
          >
            <h2>Increment and Decrement</h2>
            <Box
              sx={{
                display: 'flex',
              }}
            >
              <button onClick={increment} >+</button>
              <TextField id="outlined-basic" label="" variant="outlined" value={stateValue} />
              <button onClick={decrement} >-</button>
            </Box>
            <h2> Send transaction </h2>
            <TextField id="outlined-basic" label="Enter adderesses" variant="outlined" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            <button onClick={SendTransaction}>Send 0.0001 Eth</button>
            <Divider orientation="vertical" flexItem />
            <br />
            <h2> Sign In with Ethereum </h2>
            <button onClick={siwe} > SignIn </button>
            <p class="alert">Result:<span id="siweResult"></span></p>

          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              ml: 30
            }}
          >
            <h2> About Connected Wallet </h2>
            <div>Wallet Accounts: <br /> {wallet.accounts[0]}</div>
            <div>Wallet Balance: {wallet.balance}</div>
            <div>Hex ChainId: {wallet.chainId}</div>
            <div>Numeric ChainId: {formatChainAsNum(wallet.chainId)}</div>
          </Box>

        </Box>
      }
      {
        error && (                                        /* New code block */
          <div onClick={() => setError(false)}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )
      }
    </div >
  )
}

export default App
