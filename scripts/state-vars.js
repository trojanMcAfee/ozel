let wethAddr;
let wbtcAddr;
let renBtcAddr;
let registryAddr;
let renPoolAddr;
let tricryptoAddr;
let usdtAddr;
// let crvRenWBTC;
let crvTricrypto;
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const dappFee = 10; //prev: 10 -> 0.1% / 100-1 / 1000-10 / 10000 - 100%
const slippageOnCurve = 100; //bp: 100 -> 1%
const slippageTradingCurve = 5; //5 -> 0.05%;
const tokenName = 'PayToken';
const tokenSymbol = 'PYY';


let network = 'mainnet'; 
if (network === 'mainnet') {
    registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D';
    renPoolAddr = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B';
    tricryptoAddr = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46';
    renBtcAddr = '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D';
    wbtcAddr = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
    wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    // crvRenWBTC = '0x49849c98ae39fff122806c06791fa73784fb3675';
    crvTricrypto = '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff';
} else if (network === 'arbitrum') {
    registryAddr = '0x21C482f153D0317fe85C60bE1F7fa079019fcEbD';
    renPoolAddr = '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb';
    tricryptoAddr = '0x960ea3e3C7FB317332d990873d354E18d7645590';
    renBtcAddr = '0xdbf31df14b66535af65aac99c32e9ea844e14501';
    wbtcAddr = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';
    wethAddr = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
    usdtAddr = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
    // crvRenWBTC;
    crvTricrypto = '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2';
}


module.exports = {
    wethAddr,
    wbtcAddr,
    renBtcAddr,
    registryAddr,
    renPoolAddr,
    tricryptoAddr,
    usdtAddr,
    crvTricrypto,
    ETH,
    dappFee,
    slippageOnCurve,
    tokenName,
    tokenSymbol,
    slippageTradingCurve
};