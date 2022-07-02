import express from 'express';
import BigDecimal from 'js-big-decimal';
import { AlphaRouter, SwapRoute } from '@uniswap/smart-order-router';
import { Token, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core';
import { Pair, Route as RouteV2 } from '@uniswap/v2-sdk';
import { Pool, Route as RouteV3 } from '@uniswap/v3-sdk'
import Web3 from 'web3';
import Mixed from 'web3-utils';
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

interface IUniV3Token extends IBaseToken {
    address: string,
    name: string,
    ticker: string,
    decimals: number
}

export interface SwapDataV2 {
    input: number,
    fee: number,
    dexFee: number,
    expectedOutput: number,
    minOutput: number,
    priceImpact: number,
    path: IBaseToken[] | null,
    exchangeId: number,
    exchangeName: string,
    protocol: number
}

export interface SwapDataV3 {
    input: number,
    fee: number[],
    dexFee: number,
    expectedOutput: number,
    minOutput: number,
    priceImpact: number,
    path: IUniV3Token[] | null,
    packedPath: string,
    exchangeId: number,
    exchangeName: string,
    protocol: number
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

const getUniswapExchangeId = (chainId: number, uniswapVersion: number): any => {
    let map: {[key: number]: { uniV2: number, uniV3: number }} = {
        1: {uniV2: 0, uniV3: 4 },
        4: {uniV2: 0, uniV3: 1 },
        137: {uniV2: -1, uniV3: 2}
    };

    if (uniswapVersion === 2)
        return map[chainId].uniV2;
    else if (uniswapVersion === 3)
        return map[chainId].uniV3;
    else
        return -1;
};

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

        let bestSwap: SwapDataV2 | null = null;

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

                    if (swap === null || swap.path === null)
                        return;

                    if (bestSwap == null || swap.minOutput > new BigDecimal(bestSwap.minOutput))
                        bestSwap = {
                            input: Number(swap.input.getValue()),
                            fee: Number(swap.fee.getValue()),
                            dexFee: Number(swap.dexFee.getValue()),
                            expectedOutput: Number(Number(swap.expectedOutput.getValue()).toFixed(swap.path[swap.path.length - 1].decimals)),
                            minOutput: Number(Number(swap.minOutput.getValue()).toFixed(swap.path[swap.path.length - 1].decimals)),
                            priceImpact: Number(swap.priceImpact.getValue()),
                            path: swap.path,
                            exchangeId: swap.exchangeId,
                            exchangeName: swap.exchangeName,
                            protocol: 2
                        };
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

        let fee = 35;

        try {
            await Promise.all([fromName, fromSymbol, fromDecimals, toName, toSymbol, toDecimals]);
        } catch (e) {
            console.log(e);
            res.status(500).send();
            return;
        }

        let fromToken = new Token(chainId, from, Number(await fromDecimals), await fromSymbol, await fromName);
        let toToken = new Token(chainId, to, Number(await toDecimals), await toSymbol, await toName);

        let rpcProvider = new ethers.providers.JsonRpcProvider(chainRpc);

        const router = new AlphaRouter({ chainId: chainId, provider: rpcProvider });

        let bestSwap: SwapDataV3 | SwapDataV2 | null = null;

        let trader = new web3.eth.Contract(TraderAbi as AbiItem[], Config.networks[req.params.id].exchange);

        await Promise.all(Config.networks[req.params.id].exchanges.map(async e => {
            if (e.uniswapVersion == 3) {
                try {
                    let dexFee = FeeCalculator.calculateFeeForTotal(new BigDecimal(req.query.amount), fee);
                    let fromAmount = CurrencyAmount.fromRawAmount(fromToken, Conversions.toAu(new BigDecimal(req.query.amount).subtract(dexFee), await fromDecimals));

                    const route = await router.route(fromAmount, toToken, TradeType.EXACT_INPUT, {
                        recipient: sender,
                        slippageTolerance: new Percent(req.query.slippage, 10000),
                        deadline: Math.floor(Date.now() / 1000 + 1800)
                    });

                    if (route == null)
                        return;

                    let r = route.trade.routes[0];

                    if (r instanceof RouteV2) {
                        let swap: SwapDataV2 = {
                            input: Number(req.query.amount),
                            fee: Number(FeeCalculator.calculateFeeForTotal(new BigDecimal(req.query.amount), 30)),
                            dexFee: Number(FeeCalculator.calculateFeeForTotal(new BigDecimal(req.query.amount), fee).getValue()),
                            expectedOutput: Number(route.trade.outputAmount.toFixed(r.path[r.path.length - 1].decimals)),
                            minOutput: Number(route.trade.minimumAmountOut(new Percent(req.query.slippage, 10000), route.trade.outputAmount).toFixed(r.path[r.path.length - 1].decimals)),
                            priceImpact: Number(route.trade.priceImpact.toFixed(3)),
                            path: [],
                            exchangeId: getUniswapExchangeId(chainId, 2),
                            exchangeName: 'Uniswap v2',
                            protocol: 2
                        };

                        if (swap.exchangeId === -1)
                            return;

                        r.path.map(e => {
                            swap.path!.push({
                                address: e.address,
                                name: e.name!,
                                ticker: e.symbol!,
                                decimals: e.decimals
                            })
                        });

                        if (swap.path == null)
                            return;

                        if (bestSwap == null || (swap != null && swap.minOutput > bestSwap.minOutput))
                            bestSwap = swap;
                    }
                    else if (r instanceof RouteV3) {
                        let swap: SwapDataV3 = {
                            input: Number(req.query.amount),
                            fee: [],
                            dexFee: Number(FeeCalculator.calculateFeeForTotal(new BigDecimal(req.query.amount), fee).getValue()),
                            expectedOutput: Number(route.trade.outputAmount.toFixed(r.path[r.path.length - 1].decimals)),
                            minOutput: Number(route.trade.minimumAmountOut(new Percent(req.query.slippage, 10000), route.trade.outputAmount).toFixed(r.path[r.path.length - 1].decimals)),
                            priceImpact: Number(route.trade.priceImpact.toFixed(3)),
                            path: [],
                            packedPath: '',
                            exchangeId: getUniswapExchangeId(chainId, 3),
                            exchangeName: 'Uniswap v3',
                            protocol: 3
                        };

                        if (swap.exchangeId === -1)
                            return;

                        r.path.map(e => {
                            swap.path!.push({
                                address: e.address,
                                name: e.name!,
                                ticker: e.symbol!,
                                decimals: e.decimals
                            })
                        });

                        if (swap.path == null)
                            return;

                        r.pools.map(e => {
                            let pool: any = e;
                            swap.fee.push(pool.fee);
                        });

                        let packedPathData: string = '';

                        for (let i = 0; i < swap.fee.length; i++) {
                            packedPathData += swap.path[i].address.replace('0x', '').padStart(40, '0');
                            packedPathData += swap.fee[i].toString(16).padStart(6, '0');
                        }

                        packedPathData += swap.path[swap.path.length - 1].address.replace('0x', '').padStart(40, '0');
                        swap.packedPath = '0x' + packedPathData;

                        if (bestSwap == null || (swap != null && swap.minOutput > bestSwap.minOutput))
                            bestSwap = swap;
                    }
                    else {
                        res.status(500).send();
                        return;
                    }
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

app.get('/test/', test);
app.get('/route2/:id/', route2);
app.get('/route3/:id/', route3);