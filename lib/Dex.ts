import BigDecimal from 'js-big-decimal';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';

import TraderAbi from '../abis/Trader.json';
import UniswapFactoryAbi from '../abis/UniswapFactory.json';
import UniswapPairAbi from '../abis/UniswapPair.json';
import { Conversions } from './Conversions';
import { FeeCalculator } from './FeeCalculator';
import { IExchange } from './Config';

export interface INetwork {
    chainId: number,
    rpc: string,
    exchange: string,
    exchangeBasePairs: IBaseToken[]
}

export interface IBaseToken {
    address: string,
    name: string,
    ticker: string,
    decimals: number
}

export interface IToken extends IBaseToken {
    id: number,
    stakingAddress: string | null,
    backingToken: IBaseToken | null
}

export interface SwapData {
    input: BigDecimal,
    fee: BigDecimal,
    dexFee: BigDecimal,
    expectedOutput: BigDecimal,
    minOutput: BigDecimal,
    priceImpact: BigDecimal,
    path: IBaseToken[] | null,
    exchangeId: number,
    exchangeName: string
}

//todo: optimize by running chain calls concurrently
export class Dex {
    #net: INetwork;
    #ex: IExchange;
    #wrappedToken: IBaseToken;

    #id: number = 0;
    #fee: number = 0;;
    #factory: Contract | null = null;

    constructor(net: INetwork, ex: IExchange) {
        this.#net = net;
        this.#ex = ex;
        this.#wrappedToken = net.exchangeBasePairs[0];
    }

    init = async () => {
        let web3 = new Web3(new Web3.providers.HttpProvider(this.#net.rpc));
        let trader = new web3.eth.Contract(TraderAbi as AbiItem[], this.#net.exchange);
        let dexInfo: any = await trader.methods.queryDex(this.#ex.id).call();

        this.#id = dexInfo.id;
        this.#fee = dexInfo.fee;
        this.#factory = new web3.eth.Contract(UniswapFactoryAbi as AbiItem[], dexInfo.factory);
    }

    processBasePair = async(from: IBaseToken, to: IBaseToken, intermediate: IBaseToken, input: BigDecimal, slippageBasisPoints: number): Promise<SwapData | null> => {
        let path = await this.getFallbackPath(from, to, intermediate);
        let sd: SwapData | null = await this.calculatePathSwapData(path, input, slippageBasisPoints);

        return new Promise<SwapData | null>((resolve) => { resolve(sd); });
    }

    getBestPath = async (from: IBaseToken, to: IBaseToken, input: BigDecimal, slippageBasisPoints: number): Promise<SwapData | null> => {

        let checks: Promise<SwapData | null>[] = [];

        this.#net.exchangeBasePairs.map(async (value: IBaseToken, index: number) => {
            checks.push(this.processBasePair(from, to, value, input, slippageBasisPoints));
        })

        let best:SwapData | null = null;

        await Promise.allSettled(checks).then(results => {
            for (let r of results)
            {
                let sd: SwapData | null = (r.status === 'fulfilled' ? r.value : null);

                if (sd == null)
                    continue;
                
                if (best == null)
                {
                    best = sd;
                    continue;
                }

                if (sd.minOutput > best.minOutput)
                    best = sd;
            }
        });

        return new Promise<SwapData | null>((resolve) => { resolve(best); });
    }

    getReserves = async (from: IBaseToken, to: IBaseToken): Promise<{ pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal }> => {
        let pair = await this.getPair(to, from);
        if (!pair)
            return new Promise<{ pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal }>((resolve) => {
                resolve({
                    pairFound: false,
                    fromReserve: new BigDecimal(0),
                    toReserve: new BigDecimal(0)
                });
            });

        let web3 = new Web3(new Web3.providers.HttpProvider(this.#net.rpc));
        let pairContract = new web3.eth.Contract(UniswapPairAbi as AbiItem[], pair);
        let reserves = await pairContract.methods.getReserves().call();
        let token0 = await pairContract.methods.token0().call();
        let token1 = await pairContract.methods.token1().call();

        if (!reserves || !token0 || !token1)
            return new Promise<{ pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal }>((resolve) => {
                resolve({
                    pairFound: false,
                    fromReserve: new BigDecimal(0),
                    toReserve: new BigDecimal(0)
                });
            });

        if (from.address.toLowerCase() === token0.toLowerCase()) {
            return new Promise<{ pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal }>((resolve) => {
                resolve({
                    pairFound: true,
                    fromReserve: Conversions.fromAu(reserves.reserve0, from.decimals),
                    toReserve: Conversions.fromAu(reserves.reserve1, to.decimals),
                });
            });
        }
        else if (to.address.toLowerCase() === token0.toLowerCase()) {
            return new Promise<{ pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal }>((resolve) => {
                resolve({
                    pairFound: true,
                    fromReserve: Conversions.fromAu(reserves.reserve1, from.decimals),
                    toReserve: Conversions.fromAu(reserves.reserve0, to.decimals),
                });
            });
        }
        else
        {
            console.error("Could not calculate order of swap pair");
            return new Promise<{ pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal }>((resolve) => {
                resolve({
                    pairFound: false,
                    fromReserve: new BigDecimal(0),
                    toReserve: new BigDecimal(0)
                });
            });
        }
    }

    calculatePathSwapData = async (path: IBaseToken[] | null, input: BigDecimal, slippageBasisPoints: number): Promise<SwapData | null> => {
        if (path == null)
        return new Promise<SwapData | null>((resolve) => { resolve(null); });

        let reserveList: { pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal }[] = [];
        for (let i = 0; i < path.length - i; i++) {
            let r: { pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal } = await this.getReserves(path[i], path[i + 1]);
            reserveList.push(r);
        }

        let reserve: { pairFound: boolean, fromReserve: BigDecimal, toReserve: BigDecimal } = reserveList[0];
        let swapData: SwapData;

        if (path.length === 2) {
            swapData = await this.calculateSwapData(reserve.fromReserve, reserve.toReserve, input, slippageBasisPoints);
            swapData.path = path;
            return new Promise<SwapData | null>((resolve) => { resolve(swapData); });
        }

        swapData = await this.calculateSwapData(reserve.fromReserve, reserve.toReserve, input, 0);
        let pi: BigDecimal = swapData.priceImpact;
        let dexFee: BigDecimal = swapData.dexFee;

        for (let i = 1; i < reserveList.length; i++) {
            reserve = reserveList[i];
            swapData = await this.calculateSwapData(reserve.fromReserve, reserve.toReserve, swapData.minOutput, slippageBasisPoints, false);
        }

        swapData.dexFee = dexFee;
        swapData.input = input;
        swapData.priceImpact = pi;
        swapData.path = path;

        return new Promise<SwapData | null>((resolve) => { resolve(swapData); });
    }

    calculatePriceImpact = (v1: BigDecimal, v2: BigDecimal) => {
        let a: BigDecimal = v1.subtract(v2);
        let b: BigDecimal = v1.add(v2).divide(new BigDecimal(2), 18);
        return a.divide(b, 18).multiply(new BigDecimal(100));
    }

    calculateSwapData = (fromRes: BigDecimal, toRes: BigDecimal, input: BigDecimal, slippageBasisPoints: number, deductDexFee: boolean = true): SwapData => {
        let currentMarket: BigDecimal = fromRes.divide(toRes, 18);
        let dexFee: BigDecimal = (deductDexFee ? FeeCalculator.calculateFeeForTotal(input, this.#fee) : new BigDecimal(0));

        let amount: BigDecimal = input.subtract(dexFee);
        let uniFee: BigDecimal = FeeCalculator.calculateFeeForTotal(amount, 30);

        let coeff: BigDecimal = fromRes.multiply(toRes);
        fromRes = fromRes.add(amount.subtract(uniFee));

        let expectedOutput: BigDecimal = toRes.subtract(coeff.divide(fromRes, 18));
        let slippage: BigDecimal = FeeCalculator.calculateFeeForTotal(expectedOutput, slippageBasisPoints);
        let minOutput: BigDecimal = expectedOutput.subtract(slippage);

        //toRes = toRes.subtract(minOutput);

        let newMarket: BigDecimal = fromRes.divide(toRes, 18);
        let priceImpact = this.calculatePriceImpact(currentMarket, newMarket);

        return {
            input: input,
            fee: uniFee,
            dexFee: dexFee,
            expectedOutput: new BigDecimal(Conversions.truncate(expectedOutput, 18)),
            minOutput: new BigDecimal(Conversions.truncate(minOutput, 18)),
            priceImpact: new BigDecimal(Conversions.truncate(priceImpact, 3)),
            path: null,
            exchangeId: this.#ex.id,
            exchangeName: this.#ex.name
        }
    }

    getFallbackPath = async (from:  IBaseToken, to:  IBaseToken, intermediate: IBaseToken): Promise<IBaseToken[] | null> => {
        let path: IBaseToken[] = [];

        if (from.address === intermediate.address || to.address === intermediate.address) {
            let pair = await this.getPair(from, to);

            if (pair) {
                path.push(from, to);
                return new Promise<IBaseToken[] | null>((resolve) => { resolve(path); });
            }
        }

        let a: string | null = await this.getPair(from, intermediate);
        let b: string | null = await this.getPair(intermediate, to);

        if (a == null || b == null)
            return new Promise<IBaseToken[] | null>((resolve) => { resolve(null); });

        path.push(from, intermediate, to);
        return new Promise<IBaseToken[] | null>((resolve) => { resolve(path); });
    }

    getPair = async (from: IBaseToken, to:  IBaseToken): Promise<string | null> => {
        if (this.#factory == null) {
            console.log("Dex is not initialized");
            return new Promise<string | null>((resolve) => { resolve(null); });
        }

        let pair = await this.#factory.methods.getPair(from.address, to.address).call();
        return new Promise<string | null>((resolve) => { resolve(pair); });
    }
}