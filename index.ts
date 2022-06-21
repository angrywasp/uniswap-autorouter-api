import express from 'express';
import BigDecimal from 'js-big-decimal';
import { AlphaRouter, SwapRoute } from '@uniswap/smart-order-router';
import { Token, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'
import { ethers } from 'ethers'

import TokenAbi from './abis/Token.json';
import { Config, IExchange } from './lib/Config';
import { Dex, IBaseToken, INetwork, SwapData } from './lib/Dex';
import { FeeCalculator } from './lib/FeeCalculator';

const app = express();
const port = 8002;

app.get('/', (req: any, res: any) => {
    res.render('index');
});

app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});

const test = (req: any, res: any) => {
    res.status(200).send('hello');
}

const route2 = async (req: any, res: any) => {
    try {
        let chainId = Config.networks[req.params.id].id;
        let chainRpc = Config.networks[req.params.id].rpc;

        let from = req.query.from;
        let to = req.query.to;
        let sender = req.query.sender;
        let amount = req.query.amount;
        let slippage = req.query.slippage * 100;

        let web3 = new Web3(new Web3.providers.HttpProvider(chainRpc));
        let fromContract = new web3.eth.Contract(TokenAbi as AbiItem[], from);
        let toContract = new web3.eth.Contract(TokenAbi as AbiItem[], to);

        let network: INetwork = {
            chainId: Config.networks[req.params.id].id,
            rpc: Config.networks[req.params.id].rpc,
            exchange: Config.networks[req.params.id].exchange,
            exchangeBasePairs: Config.networks[req.params.id].exchangeBasePairs
        }

        let fromName = fromContract.methods.name().call();
        let fromSymbol = fromContract.methods.symbol().call();
        let fromDecimals = fromContract.methods.decimals().call();

        let toName = toContract.methods.name().call();
        let toSymbol = toContract.methods.symbol().call();
        let toDecimals = toContract.methods.decimals().call();

        await Promise.all([fromName, fromSymbol, fromDecimals, toName, toSymbol, toDecimals]);

        let fromToken: IBaseToken = {
            address: from,
            name: await fromName,
            ticker: await fromSymbol,
            decimals: Number(await fromDecimals)
        };

        let toToken: IBaseToken = {
            address: to,
            name: await toName,
            ticker: await toSymbol,
            decimals: Number(await toDecimals)
        };

        let bestSwap: SwapData | null = null;

        await Promise.all(Config.networks[req.params.id].exchanges.map(async e => {
            if (e.uniswapVersion == 2) {
                let ex: IExchange = {
                    id: e.id,
                    name: e.name,
                    uniswapVersion: e.uniswapVersion
                };

                let dex: Dex = new Dex(network, ex);
                await dex.init();
                let swap: SwapData | null = await dex.getBestPath(fromToken, toToken, new BigDecimal(amount), slippage);
                if (bestSwap == null || (swap != null && swap.minOutput > bestSwap.minOutput))
                    bestSwap = swap;
            }
        }));

        if (bestSwap == null)
            res.status(404).send();
        else {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify(bestSwap, null, 4));
        }
    } catch (e) {
        console.log(e);
        res.status(400).send();
    }
}

const route3 = async (req: any, res: any) => {
    try {
        let chainId = Config.networks[req.params.id].id;
        let chainRpc = Config.networks[req.params.id].rpc;

        let from = req.query.from;
        let to = req.query.to;
        let sender = req.query.sender;
        let amount = req.query.amount;
        let slippage = req.query.slippage;

        let fee = 25;

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

        let swaps: SwapRoute[] = [];

        await Promise.all(Config.networks[req.params.id].exchanges.map(async e => {
            if (e.uniswapVersion == 3) {
                const route = await router.route(fromAmount, toToken, TradeType.EXACT_INPUT, {
                    recipient: sender,
                    slippageTolerance: new Percent(slippage, 100),
                    deadline: Math.floor(Date.now() / 1000 + 1800)
                });
                
                if (route != null)
                    swaps.push(route);
            }
        }));

        

        /*let swap: SwapData = {
            input: amount,
            fee: FeeCalculator.calculateFeeForTotal(amount, fee),
            dexFee: new BigDecimal(0),

        }*/

        /*let swap: SwapData = {
            input: BigDecimal,
    fee: BigDecimal,
    dexFee: BigDecimal,
    expectedOutput: BigDecimal,
    minOutput: BigDecimal,
    priceImpact: BigDecimal,
    path: IBaseToken[] | null,
    exchangeId: number,
    exchangeName: string
        }*/

        if (swaps == null || swaps.length === 0)
            res.status(404).send();
        else {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify(swaps, null, 4));
        }
    } catch (e) {
        console.log(e);
        res.status(400).send();
    }
}

app.get('/test/', test);
app.get('/route2/:id/', route2);
app.get('/route3/:id/', route3);