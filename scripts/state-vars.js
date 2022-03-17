let wethAddr;
let tricryptoAddr;
let usdtAddr;
let crvTricrypto;
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const dappFee = 10; //prev: 10 -> 0.1% / 100-1 / 1000-10 / 10000 - 100%
const slippageOnCurve = 100; //bp: 100 -> 1%
const slippageTradingCurve = 5; //5 -> 0.05%;
const tokenName = 'PayToken';
const tokenSymbol = 'PYY';


let network = 'mainnet'; 
if (network === 'mainnet') {
    tricryptoAddr = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46';
    wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    crvTricrypto = '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff';
} else if (network === 'arbitrum') {
    tricryptoAddr = '0x960ea3e3C7FB317332d990873d354E18d7645590';
    wethAddr = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
    usdtAddr = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
    crvTricrypto = '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2';
}


module.exports = {
    wethAddr,
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