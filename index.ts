import express from 'express';
import { AlphaRouter } from '@uniswap/smart-order-router';
import { TradeType } from '@uniswap/smart-order-router';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'

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
    xdai: { id: 100, rpc: 'https://rpc.xdaichain.com/' },
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

const quote = async (req: any, res: any) => {
    try
    {
        let chainId = networks[req.params.id].id;
        let chainRpc = networks[res.params.id].rpc;

        let from = req.query.from;
        let to = req.query.to;
        let sender = req.query.sender;

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

        let fromToken = new Token(chainId, from, await fromDecimals, await fromSymbol, await fromName);
        let toToken = new Token(chainId, to, await toDecimals, await toSymbol, await toName);

        const router = new AlphaRouter({ chainId: chainId, provider: chainRpc });

        const route = await router.route(0, to, TradeType.EXACT_INPUT, {

        });
    } catch (e) {
        console.log(e);
        res.status(400).send('Bad Request');
    }
}

/*const bridge = async (req: any, res: any) => {

    try {
        const id = parseInt(req.params.id);

        let bridge: Bridge = new Bridge(id);
        let result = await bridge.getSorted();
        res.status(200).send(Util.toJson(result));
    } catch {
        res.status(400).send('Bad Request');
    }
}

const bridgeCount = async (req: any, res: any) => {

    try {
        const id = parseInt(req.params.id);

        let entityCount = await Util.getEntityCount(id);
        if (entityCount == null) {
            res.status(400).send('Bad Request');
        }
        else {
            res.status(200).send(entityCount?.toString());
        }
    } catch {
        res.status(400).send('Bad Request');
    }
}*/

app.get('/test/', test);
app.get('/quote/:id/', quote);
//app.get('/bridge/:id', bridge);
//app.get('/bridge/count/:id', bridgeCount);