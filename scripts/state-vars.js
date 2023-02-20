const { ethers } = require("ethers");

let usdtAddrArb;
let wbtcAddr;
let wethAddr;
let usdcAddr;
let mimAddr;
let tricryptoAddr;
let crvTricrypto;
let mimPoolAddr;
let crv2PoolAddr;
let yTricryptoPoolAddr;
let fraxPoolAddr;
let fraxAddr;
let swapRouterUniAddr; 
let chainlinkAggregatorAddr;
let deadAddr;
let usxAddr;
let dForcePoolAddr;
let pokeMeOpsAddr; 
let hopBridge;
let inbox; 
let gelatoAddr;
let tokensDatabaseL1;
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const nullAddr = '0x0000000000000000000000000000000000000000';
const testnetReceiver = '0x49B7e3BC581DEF1E16645706dcE4AbFce5e61C88'; 
const myReceiver = '0x2B75D8312cA463Dea9E80981b5c690f15E94Bd55';
const protocolFee = 10; 
const poolFeeUni = 500; 
const defaultSlippage = 100;
const revenueAmounts = [
    10000000, 
    50000000,
    100000000,
    500000000,
    1000000000,
    5000000000,
    10000000000
];

const tokenName = 'Ozel';
const tokenSymbol = 'OZL';


const diamondABI = [
    'function setTESTVAR2(uint256 num_, bytes32 position_) public',
    'function diamondCut((address facetAddress, uint8 action, bytes4[] functionSelectors)[] _diamondCut, address _init, bytes _calldata) external',
    'function getOzelIndex() external view returns (uint256)',
    'function getRegulatorCounter() external view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address recipient, uint256 amount) returns (bool)',
    'function exchangeToAccountToken(bytes,uint256,address) external payable',
    'function withdrawUserShare(bytes,address,uint256) external',
    'function enableWithdrawals(bool state_) external',
    'function updateExecutorState(uint256 amount_, address user_, uint256 lockNum_) external payable',
    'function deposit(uint256 assets, address receiver, uint256 lockNum_) external payable returns (uint256 shares)',
    'function executeFinalTrade(tuple(int128 tokenIn, int128 tokenOut, address baseToken, address token, address pool) swapDetails_, uint256 slippage, address user_, uint256 lockNum_) external payable',
    'function redeem(uint256 shares, address receiver, address owner, uint256 lockNum_) external returns (uint256 assets)',
    'function burn(address account, uint256 amount, uint256 lockNum_) external',
    'function modifyPaymentsAndVolumeExternally(address user_, uint256 newAmount_, uint256 lockNum_) external',
    'function addTokenToDatabase((int128 tokenIn, int128 tokenOut, address baseToken, address token, address pool) newSwap_, (address l1Address, address l2Address) token_) external',
    'function transferUserAllocation(address sender_, address receiver_, uint256 amount_, uint256 senderBalance_, uint256 lockNum_) external',
    'function owner() external view returns (address owner_)',
    'function queryTokenDatabase(address token_) external view returns (bool)',
    'function getAUM() external view returns (uint,uint)',
    'function getTotalVolumeInETH() external view returns(uint)',
    'function getTotalVolumeInUSD() external view returns(uint)',
    'function getOzelBalances(address) external view returns (uint,uint)',
    'function removeTokenFromDatabase((int128,int128,address,address,address) swapToRemove_, (address l1Address, address l2Address) token_) external',
    'function facetAddress(bytes4 _functionSelector) external view returns (address facetAddress_)',
    'function getProtocolFee() external view returns(uint)',
    'function changeL1Check(bool newState_) external',
    'function getAccountPayments(address) external view returns(uint256)',
    'function getUserByL1Account(address) external view returns(address)',
    'function setAuthorizedCaller(address caller_, bool newStatus_) external',
    'function getFunds() external'
];


const proxyABIeth = [
    'function setTestReturnContract(address testReturn_, bytes32 position_) public',
    'function changeAccountSlippage(uint16) external',
    'function changeAccountToken(address) external',
    'function sendToArb(uint256,uint256,address) external payable',
    'function initialize(address,bytes)',
    'function getAccountDetails() external view returns (address,address,uint16)',
    'function changeAccountTokenNSlippage(address,uint16) external',
    'function withdrawETH_lastResort() external'
];

const factoryABI = [
    'function createNewProxy((address,address,uint256,string)) external returns(address)',
    'function initialize()',
    'function getImplementation() external view returns(address)',
    'function upgradeTo(address newImplementation) external',
    'function getOwner() external view returns(address)',
    'function changeOwner(address newOwner_) external'
];

const opsL2 = {
    gasLimit: ethers.BigNumber.from('25000000'),
    gasPrice: ethers.BigNumber.from('25134698068') 
};

const opsL2_2 = {
    gasLimit: ethers.BigNumber.from('5000000'),
    gasPrice: ethers.BigNumber.from('5134698068')
};

const ops = {
    gasLimit: ethers.BigNumber.from('30000000'),
    gasPrice: ethers.BigNumber.from('10134698068') 
};

const signerX = new ethers.Wallet(process.env.PK);
const signerTestnet = new ethers.Wallet(process.env.PK_TESTNET);
const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM);
const l1Provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET);

let l1Signer, l2Signer, l1SignerTestnet, l2SignerTestnet;
let l1ProviderTestnet, l2ProviderTestnet;

let network = 'mainnet';
switch(network) {
    case 'goerli':
        pokeMeOpsAddr = '0xc1C6805B857Bef1f412519C4A842522431aFed39'; 
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; //no testnet
        inbox = '0x6BEbC4925716945D46F0Ec336D5C2564F419682C';
        gelatoAddr = '0x683913B3A32ada4F8100458A3E1675425BdAa7DF';
        swapRouterUniAddr = nullAddr;
        chainlinkAggregatorAddr = nullAddr;
        wethAddr = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
        usdcAddr = '0xd35CCeEAD182dcee0F148EbaC9447DA2c4D449c4';
        mimAddr = '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3'; //mainnet
        wbtcAddr = '0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05';
        usdtAddrArb = '0xe583769738b6dd4E7CAF8451050d1948BE717679';
        fraxAddr = '0x92d43093959C7DDa89896418bCE9DE0B87879646';
        
        l1ProviderTestnet = new ethers.providers.JsonRpcProvider(process.env.GOERLI);
        l1Signer = signerX.connect(l1ProviderTestnet);
        l1SignerTestnet = signerTestnet.connect(l1ProviderTestnet);

        l2ProviderTestnet = new ethers.providers.JsonRpcProvider(process.env.ARB_GOERLI);
        l2Signer = signerX.connect(l2ProviderTestnet);
        l2SignerTestnet = signerTestnet.connect(l2ProviderTestnet);
        break;
    case 'mainnet': 
        pokeMeOpsAddr = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; 
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; 
        usdtAddrArb = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; 
        inbox = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f'; 

        tricryptoAddr = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46';
        crvTricrypto = '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff';
        wethAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; 
        wbtcAddr = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
        usdcAddr = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        mimAddr = '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3';
        mimPoolAddr = '0x5a6A4D54456819380173272A5E8E9B9904BdF41B'; 
        crv2PoolAddr = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; 
        yTricryptoPoolAddr = '';
        gelatoAddr = '0x3caca7b48d0573d793d3b0279b5f0029180e83b6';
        swapRouterUniAddr = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
        chainlinkAggregatorAddr = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';
        fraxAddr = '0x853d955aCEf822Db058eb8505911ED77F175b99e'; 
        deadAddr = '0x000000000000000000000000000000000000dEaD';

        l1ProviderTestnet = new ethers.providers.JsonRpcProvider(process.env.GOERLI);
        l2ProviderTestnet = new ethers.providers.JsonRpcProvider(process.env.ARB_GOERLI);

        break; 
    case 'arbitrum':
        pokeMeOpsAddr = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; 
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; //mainnet
        inbox = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f';

        usdtAddrArb = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
        tricryptoAddr = '0x960ea3e3C7FB317332d990873d354E18d7645590';
        crvTricrypto = '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2';
        wethAddr = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
        wbtcAddr = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f';
        usdcAddr = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
        mimAddr = '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A';
        mimPoolAddr = '0x30dF229cefa463e991e29D42DB0bae2e122B2AC7';
        crv2PoolAddr = '0x7f90122BF0700F9E7e1F688fe926940E8839F353';
        yTricryptoPoolAddr = '0x239e14A19DFF93a17339DCC444f74406C17f8E67';
        fraxPoolAddr = '0xf07d553B195080F84F582e88ecdD54bAa122b279';
        fraxAddr = '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F';
        gelatoAddr = '0x4775af8fef4809fe10bf05867d2b038a4b5b2146';
        deadAddr = '0x000000000000000000000000000000000000dEaD';
        chainlinkAggregatorAddr = '0x639fe6ab55c921f74e7fac1ee960c0b6293ba612';
        swapRouterUniAddr = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
        usxAddr = '0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb';
        dForcePoolAddr = '0x2ce5Fd6f6F4a159987eac99FF5158B7B62189Acf';

        tokensDatabaseL1 = {
            usdtAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            usdcAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            fraxAddr: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
            wbtcAddr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            mimAddr: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
            usxAddr: '0x0a5E677a6A24b2F1A2Bf4F3bFfC443231d2fDEc8'
        };
} 




module.exports = {
    wbtcAddr,
    wethAddr,
    usdcAddr,
    mimAddr,
    tricryptoAddr,
    crvTricrypto,
    mimPoolAddr,
    crv2PoolAddr,
    yTricryptoPoolAddr,
    fraxPoolAddr,
    fraxAddr,
    ETH,
    protocolFee,
    tokenName,
    tokenSymbol,
    defaultSlippage,
    pokeMeOpsAddr,
    hopBridge,
    usdtAddrArb,
    inbox,
    signerX,
    l2ProviderTestnet,
    l2Signer,
    l1Signer,
    gelatoAddr,
    swapRouterUniAddr,
    poolFeeUni,
    nullAddr,
    chainlinkAggregatorAddr,
    deadAddr,
    revenueAmounts,
    diamondABI,
    usxAddr,
    dForcePoolAddr,
    l1ProviderTestnet,
    l2Provider,
    proxyABIeth,
    factoryABI,
    network,
    ops,
    testnetReceiver,
    myReceiver,
    signerTestnet,
    l1SignerTestnet,
    l2SignerTestnet,
    l1Provider,
    opsL2,
    opsL2_2,
    tokensDatabaseL1
};




