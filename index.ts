import express from 'express';
import BigDecimal from 'js-big-decimal';
import { AlphaRouter, SwapRoute } from '@uniswap/smart-order-router';
import { Token, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'
import { ethers } from 'ethers'

import TokenAbi from './abis/Token.json';
import TraderAbi from './abis/Trader.json';
import { Config, IExchange } from './lib/Config';
import { Dex, IBaseToken, INetwork, SwapData } from './lib/Dex';
import { FeeCalculator } from './lib/FeeCalculator';
import { Conversions } from './lib/Conversions';

const app = express();
const port = 8002;

interface IUniV3Token extends IBaseToken
{
    address: string,
    name: string,
    ticker: string,
    decimals: number
    fee: number
}

export interface SwapDataV3 {
    input: BigDecimal,
    fee: BigDecimal,
    expectedOutput: BigDecimal,
    minOutput: BigDecimal,
    priceImpact: BigDecimal,
    path: IUniV3Token[] | null,
    exchangeId: number,
    exchangeName: string
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

const route2 = async (req: any, res: any) => {
    try {
        let chainId = Config.networks[req.params.id].id;
        let chainRpc = Config.networks[req.params.id].rpc;

        let from = req.query.from;
        let to = req.query.to;
        let sender = req.query.sender;
        let amount = req.query.amount;
        let slippage = req.query.slippage;

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

        try {
            await Promise.all([fromName, fromSymbol, fromDecimals, toName, toSymbol, toDecimals]);
        } catch (e) {
            console.log(e);
            res.status(500).send();
            return;
        }

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
                try {
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
                } catch (e) {
                    console.log(e);
                    res.status(500).send();
                    return;
                }
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
        
        let web3 = new Web3(new Web3.providers.HttpProvider(chainRpc));

        let fromContract = new web3.eth.Contract(TokenAbi as AbiItem[], from);
        let toContract = new web3.eth.Contract(TokenAbi as AbiItem[], to);

        let fromName = fromContract.methods.name().call();
        let fromSymbol = fromContract.methods.symbol().call();
        let fromDecimals = fromContract.methods.decimals().call();

        let toName = toContract.methods.name().call();
        let toSymbol = toContract.methods.symbol().call();
        let toDecimals = toContract.methods.decimals().call();

        let fee = 100;

        try {
            await Promise.all([fromName, fromSymbol, fromDecimals, toName, toSymbol, toDecimals]);
        } catch (e) {
            console.log(e);
            res.status(500).send();
            return;
        }

        let amount = Conversions.toAu(new BigDecimal(req.query.amount), await fromDecimals);
        let fromToken = new Token(chainId, from, Number(await fromDecimals), await fromSymbol, await fromName);
        let toToken = new Token(chainId, to, Number(await toDecimals), await toSymbol, await toName);

        let fromAmount = CurrencyAmount.fromRawAmount(fromToken, amount);

        let rpcProvider = new ethers.providers.JsonRpcProvider(chainRpc);

        const router = new AlphaRouter({ chainId: chainId, provider: rpcProvider });

        let swaps: any[] = [];

        let trader = new web3.eth.Contract(TraderAbi as AbiItem[], Config.networks[req.params.id].exchange);

        await Promise.all(Config.networks[req.params.id].exchanges.map(async e => {
            if (e.uniswapVersion == 3) {
                try {
                    //let dexInfo: any = await trader.methods.queryDex(e.id).call(); 
                    const route = await router.route(fromAmount, toToken, TradeType.EXACT_INPUT, {
                        recipient: sender,
                        slippageTolerance: new Percent(req.query.slippage, 10000),
                        deadline: Math.floor(Date.now() / 1000 + 1800)
                    });
                    
                    if (route != null) {
                        let swap: SwapDataV3 = {
                            input: new BigDecimal(req.query.amount),
                            fee: FeeCalculator.calculateFeeForTotal(new BigDecimal(req.query.amount), fee),
                            expectedOutput: new BigDecimal(0),
                            minOutput: new BigDecimal(0),
                            priceImpact: new BigDecimal(0),
                            path: [],
                            exchangeId: -1,
                            exchangeName: 'Uniswap v3'
                        }

                        route.route[0].tokenPath.map(e => {
                            swap.path!.push({
                                address: e.address,
                                name: e.name!,
                                ticker: e.symbol!,
                                decimals: e.decimals,
                                fee: 0
                            })
                        });

                        swaps.push(swap);
                        swaps.push(route);
                    }
                } catch (e) {
                    console.log(e);
                    res.status(500).send();
                    return;
                }
            }
        }));

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