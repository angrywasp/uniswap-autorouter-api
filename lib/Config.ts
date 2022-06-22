export interface IExchangeBasePair {
    address: string,
    name: string,
    ticker: string,
    decimals: number
}

export interface IExchange {
    id: number,
    name: string,
    uniswapVersion: number
}

export interface IChain {
    id: number,
    rpc: string,
    exchangeBasePairs: IExchangeBasePair[],
    exchanges: IExchange[],
    exchange: string,
}

export class Config {
    static networks: {[key: string]: IChain} = {
        eth: {
            id: 1,
            rpc: 'https://mainnet.infura.io/v3/9354d2b6c5ee45c2a4036efd7b617783',
            exchangeBasePairs: [
                {
                    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                    name: 'Wrapped ETH',
                    ticker: 'WETH',
                    decimals: 18
                },
                {
                    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                    name: 'Tether USD',
                    ticker: 'USDT',
                    decimals: 6
                },
                {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    name: 'USD Coin',
                    ticker: 'USDC',
                    decimals: 6
                },
                {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    name: 'Dai Stablecoin',
                    ticker: 'DAI',
                    decimals: 18
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: 'UniSwap v2',
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: 'SushiSwap',
                    uniswapVersion: 2
                },
                {
                    id: 2,
                    name: 'ShibaSwap',
                    uniswapVersion: 2
                },
                {
                    id: 3,
                    name: 'CRO Defi Swap',
                    uniswapVersion: 2
                },
                {
                    id: 4,
                    name: 'UniSwap v3',
                    uniswapVersion: 3
                }
            ],
            exchange: '0x9Bb0cF3BFe76603D7af6dC84da91756f109f695A'
        },
        rinkeby: {
            id: 4,
            rpc: 'https://rinkeby.infura.io/v3/9354d2b6c5ee45c2a4036efd7b617783',
            exchangeBasePairs: [
                {
                    address: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
                    name: "Wrapped ETH",
                    ticker: "WETH",
                    decimals: 18
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: "Rinkeby-UniSwap v2",
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: "Rinkeby-UniSwap v3",
                    uniswapVersion: 3
                }
            ],
            exchange: '0x09c2E07dd1385c1C3c7695009e3eB29312aD3070'
        },
        bnb: {
            id: 56,
            rpc: 'https://bsc-dataseed.binance.org/',
            exchangeBasePairs: [
                {
                    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                    name: 'Wrapped BNB',
                    ticker: 'WBNB',
                    decimals: 18
                },
                {
                    address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
                    name: 'Binance-Peg USDC',
                    ticker: 'USDC',
                    decimals: 18
                },
                {
                    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
                    name: 'Binance-Peg BUSD',
                    ticker: 'BUSD',
                    decimals: 18
                },
                {
                    address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
                    name: 'Binance-Peg ETH',
                    ticker: 'ETH',
                    decimals: 18
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: 'PancakeSwap',
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: 'SushiSwap',
                    uniswapVersion: 2
                }
            ],
            exchange: '0x3BC920459BEa19f090402FD77896d090573171ae'
        },
        matic: {
            id: 137,
            rpc: 'https://rpc-mainnet.maticvigil.com',
            exchangeBasePairs: [
                {
                    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                    name: 'Wrapped MATIC',
                    ticker: 'WMATIC',
                    decimals: 18
                },
                {
                    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                    name: '(PoS) USD Coin',
                    ticker: 'USDC',
                    decimals: 6
                },
                {
                    address: '0xf82ce0B3025FC0aC3d96c9cbE6e5c670Df95C0Bf',
                    name: 'Wrapped USDC',
                    ticker: 'USDCw',
                    decimals: 6
                },
                {
                    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                    name: 'Wrapped ETH',
                    ticker: 'WETH',
                    decimals: 18
                },
                {
                    address: '0x831753DD7087CaC61aB5644b308642cc1c33Dc13',
                    name: 'Quickswap',
                    ticker: 'QUICK',
                    decimals: 18
                },
                {
                    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                    name: '(PoS) Tether USD',
                    ticker: 'USDT',
                    decimals: 6
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: 'QuickSwap',
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: 'SushiSwap',
                    uniswapVersion: 2
                },
                {
                    id: 2,
                    name: 'UniSwap v3',
                    uniswapVersion: 3
                },
            ],
            exchange: '0xB2da7aCF973b99Fa3bFDA9b9276Ed5358231f135'
        },
        avax: {
            id: 43114,
            rpc: 'https://api.avax.network/ext/bc/C/rpc',
            exchangeBasePairs: [
                {
                    address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
                    name: 'Wrapped AVAX',
                    ticker: 'WAVAX',
                    decimals: 18
                },
                {
                    address: '0x130966628846BFd36ff31a822705796e8cb8C18D',
                    name: 'Magic Internet Money',
                    ticker: 'MIM',
                    decimals: 18
                },
                {
                    address: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
                    name: 'Bridge USDC',
                    ticker: 'USDC.e',
                    decimals: 6
                },
                {
                    address: '0xc7198437980c041c805a1edcba50c1ce5db95118',
                    name: 'Bridge USDT',
                    ticker: 'USDT.e',
                    decimals: 6
                },
                {
                    address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
                    name: 'USD Coin',
                    ticker: 'USDC',
                    decimals: 6
                },
                {
                    address: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70',
                    name: 'Bridge DAI',
                    ticker: 'DAI.e',
                    decimals: 18
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: 'Trader Joe',
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: 'YetiSwap',
                    uniswapVersion: 2
                },
                {
                    id: 2,
                    name: 'Pangolin',
                    uniswapVersion: 2
                }
            ],
            exchange: '0x4e33217C7d6067b3CC7aFF45DD99A030b50B080c'
        },
        xdai: {
            id: 100,
            rpc: 'https://gnosis-mainnet.public.blastapi.io',
            exchangeBasePairs: [
                {
                    address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
                    name: 'Wrapped XDAI',
                    ticker: 'WXDAI',
                    decimals: 18
                },
                {
                    address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
                    name: 'Bridge USD Coin',
                    ticker: 'USDC',
                    decimals: 6
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: 'SushiSwap',
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: 'HoneySwap',
                    uniswapVersion: 2
                }
            ],
            exchange: '0xEd95C6A9D3204E3f5f232B690043F4fBc66BB0D3'
        },
        ftm: {
            id: 250,
            rpc: 'https://rpc.ftm.tools/',
            exchangeBasePairs: [
                {
                    address: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
                    name: 'Wrapped FTM',
                    ticker: 'WFTM',
                    decimals: 18
                },
                {
                    address: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
                    name: 'USD Coin',
                    ticker: 'USDC',
                    decimals: 6
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: 'SpookySwap',
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: 'SpiritSwap',
                    uniswapVersion: 2
                },
                {
                    id: 2,
                    name: 'SushiSwap',
                    uniswapVersion: 2
                }
            ],
            exchange: '0xC14f34E6329B8620192B5Dbff541E87b5a10CB8e'
        },
        cro: {
            id: 25,
            rpc: 'https://evm-cronos.crypto.org',
            exchangeBasePairs: [
                {
                    address: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
                    name: 'Wrapped CRO',
                    ticker: 'WCRO',
                    decimals: 18
                },
                {
                    address: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
                    name: 'Bridge USDC',
                    ticker: 'USDC',
                    decimals: 6
                }
            ],
            exchanges: [
                {
                    id: 0,
                    name: 'Crodex',
                    uniswapVersion: 2
                },
                {
                    id: 1,
                    name: 'VVS Finance',
                    uniswapVersion: 2
                }
            ],
            exchange: '0x135C2fb255A5fFC61C14B205dCd4f2f161D6CD5a'
        }
    }
}