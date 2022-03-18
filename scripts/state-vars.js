let wethAddr;
let tricryptoAddr;
let crvTricrypto;
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const dappFee = 10; //prev: 10 -> 0.1% / 100-1 / 1000-10 / 10000 - 100%
const slippageOnCurve = 100; //bp: 100 -> 1%
const slippageTradingCurve = 5; //5 -> 0.05%;
const tokenName = 'PayToken';
const tokenSymbol = 'PYY';

let chainId; //arbitrum
let pokeMeOpsAddr; //gelato
let hopBridge;
let usdtAddrArb;
let inbox; //arbitrum rinkeby


const signerX = new ethers.Wallet(process.env.PK);
const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ARB_TESTNET);
const l1ProviderRinkeby = new ethers.providers.JsonRpcProvider(process.env.RINKEBY);
const l2Signer = signerX.connect(l2Provider);
const l1Signer = signerX.connect(l1ProviderRinkeby);



let network = 'rinkeby';
switch(network) {
    case 'rinkeby':
        chainId = 421611;
        pokeMeOpsAddr = '0x8c089073A9594a4FB03Fa99feee3effF0e2Bc58a';
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; //no testnet
        usdtAddrArb = '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD';
        inbox = '0x578BAde599406A8fE3d24Fd7f7211c0911F5B29e';
        break;
    case 'mainnet': //mainnet and arbitrum
        chainId = 42161;
        pokeMeOpsAddr = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; //mainnet
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; //mainnet
        usdtAddrArb = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'; 
        inbox = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f'; //mainnet

        //*** new */
        tricryptoAddr = '0x960ea3e3C7FB317332d990873d354E18d7645590';
        wethAddr = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
        crvTricrypto = '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2';
        break;
   
} 




module.exports = {
    wethAddr,
    tricryptoAddr,
    crvTricrypto,
    ETH,
    dappFee,
    slippageOnCurve,
    tokenName,
    tokenSymbol,
    slippageTradingCurve,
    chainId,
    pokeMeOpsAddr,
    hopBridge,
    usdtAddrArb,
    inbox,
    signerX,
    l2Provider,
    l2Signer,
    l1Signer
};

