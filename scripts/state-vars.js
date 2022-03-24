let wbtcAddr;
let renBtcAddr;
let wethAddr;
let usdcAddr;
let mimAddr;
let tricryptoAddr;
let crvTricrypto;
let renPoolAddr;
let mimPoolAddr;
let crv2PoolAddr;
let yTricryptoPoolAddr;
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const dappFee = 10; //prev: 10 -> 0.1% / 100-1 / 1000-10 / 10000 - 100%
const slippageOnCurve = 100; //bp: 100 -> 1%
const slippageTradingCurve = 100; //5 -> 0.05%;
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



let network = 'arbitrum';
switch(network) {
    case 'rinkeby':
        chainId = 421611;
        pokeMeOpsAddr = '0x8c089073A9594a4FB03Fa99feee3effF0e2Bc58a';
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; //no testnet
        usdtAddrArb = '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD';
        inbox = '0x578BAde599406A8fE3d24Fd7f7211c0911F5B29e';
        break;
    case 'mainnet': 
        chainId = 42161;
        pokeMeOpsAddr = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; 
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; 
        usdtAddrArb = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; 
        inbox = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f'; 

        tricryptoAddr = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46';
        crvTricrypto = '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff';
        wethAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; 
        wbtcAddr = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
        renBtcAddr = '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D';
        renPoolAddr = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B';
        usdcAddr = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        mimAddr = '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3';
        mimPoolAddr = '0x5a6A4D54456819380173272A5E8E9B9904BdF41B'; //it differs from arb as 3crv to 2crv
        crv2PoolAddr = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; //crv3
        yTricryptoPoolAddr = '';
        break; 
    case 'arbitrum':
        pokeMeOpsAddr = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; //mainnet
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; //mainnet
        inbox = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f'; //mainnet

        usdtAddrArb = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
        tricryptoAddr = '0x960ea3e3C7FB317332d990873d354E18d7645590';
        crvTricrypto = '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2';
        wethAddr = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
        wbtcAddr = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f';
        renBtcAddr = '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501';
        renPoolAddr = '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb';
        usdcAddr = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
        mimAddr = '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A';
        mimPoolAddr = '0x30dF229cefa463e991e29D42DB0bae2e122B2AC7';
        crv2PoolAddr = '0x7f90122BF0700F9E7e1F688fe926940E8839F353';
        yTricryptoPoolAddr = '0x239e14A19DFF93a17339DCC444f74406C17f8E67';
} 




module.exports = {
    wbtcAddr,
    renBtcAddr,
    wethAddr,
    usdcAddr,
    mimAddr,
    tricryptoAddr,
    crvTricrypto,
    renPoolAddr,
    mimPoolAddr,
    crv2PoolAddr,
    yTricryptoPoolAddr,
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

