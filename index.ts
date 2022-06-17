import express from 'express';
import { AlphaRouter } from '@uniswap/smart-order-router';
import { Token, CurrencyAmount, Percent, TradeType} from '@uniswap/sdk-core';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'
import { ethers } from 'ethers'

import TokenAbi from './abis/Token.json';

const app = express();
const port = 8002;

interface IChain {
    id: any,
    rpc: any
}

const networks: {[key: string]: IChain} = {
    eth: { id: 1, rpc: 'https://mainnet.infura.io/v3/9354d2b6c5ee45c2a4036efd7b617783' },
    bnb: { id: 56, rpc: 'https://bsc-dataseed.binance.org/' },
    matic: { id: 137, rpc: 'https://rpc-mainnet.maticvigil.com' },
    avax: { id: 43114, rpc: 'https://api.avax.network/ext/bc/C/rpc' },
    xdai: { id: 100, rpc: 'https://gnosis-mainnet.public.blastapi.io' },
    ftm: { id: 250, rpc: 'https://rpc.ftm.tools/' },
    cro: { id: 25, rpc: 'https://evm-cronos.crypto.org' }
}

app.get('/', (req: any, res: any) => {
    res.render('index');
});

app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});

const test = (req: any, res: any) => {
    res.status(200).send('hello');
}

const route = async (req: any, res: any) => {
    try
    {
        let chainId = networks[req.params.id].id;
        let chainRpc = networks[req.params.id].rpc;

        let from = req.query.from;
        let to = req.query.to;
        let sender = req.query.sender;
        let amount = req.query.amount;

        let web3 = new Web3(new Web3.providers.HttpProvider(chainRpc));
        let fromContract = new web3.eth.Contract(TokenAbi as AbiItem[], from);
        let toContract = new web3.eth.Contract(TokenAbi as AbiItem[], to);

        let fromName = fromContract.methods.name().call();
        let fromSymbol = fromContract.methods.symbol().call();
        let fromDecimals = fromContract.methods.decimals().call();

        let toName = toContract.methods.name().call();
        let toSymbol = toContract.methods.symbol().call();
        let toDecimals = toContract.methods.decimals().call();

        await Promise.all([fromName, fromSymbol, fromDecimals, toName, toSymbol, toDecimals]);

        let fromToken = new Token(chainId, from, Number(await fromDecimals), await fromSymbol, await fromName);
        let toToken = new Token(chainId, to, Number(await toDecimals), await toSymbol, await toName);

        let fromAmount = CurrencyAmount.fromRawAmount(fromToken, amount);

        let rpcProvider = new ethers.providers.JsonRpcProvider(chainRpc);

        const router = new AlphaRouter({ chainId: chainId, provider: rpcProvider });

        const route = await router.route(fromAmount, toToken, TradeType.EXACT_INPUT, {
            recipient: sender,
            slippageTolerance: new Percent(5, 100),
            deadline: Math.floor(Date.now() / 1000 + 1800)
        });

        if (route == null)
            res.status(404).send();
        else {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify(route, null, 4));
        }
    } catch (e) {
        console.log(e);
        res.status(400).send();
    }
}

app.get('/test/', test);
app.get('/route/:id/', route);