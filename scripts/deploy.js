const diamond = require('diamond-util');
const { getSelectors } = require('./libraries/diamond.js');

const {
    wethAddr,
    tricryptoAddr,
    usdtAddrArb,
    crvTricrypto,
    wbtcAddr,
    renBtcAddr,
    renPoolAddr,
    usdcAddr,
    mimAddr,
    fraxAddr,
    mimPoolAddr,
    crv2PoolAddr,
    yTricryptoPoolAddr,
    fraxPoolAddr,
    ETH,
    dappFee,
    slippageOnCurve,
    tokenName,
    tokenSymbol,
    slippageTradingCurve
} = require('./state-vars.js');


async function deployFacet(facetName) {
    const Contract = await hre.ethers.getContractFactory(facetName);
    const contract = await Contract.deploy();
    await contract.deployed();
    console.log(`${facetName} deployed to: `, contract.address);
    return contract;
}

function getSelectorsFromAllFacets(facets) { 
    const selectors = [];
    for (let i = 0; i < facets.length; i++) {
        selectors.push(getSelectors(facets[i]).filter((el) => typeof el === 'string'));
    }
    return selectors;
}


//Deploys contracts in Arbitrum
async function deploy() {
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    console.log('--');
    console.log('Caller 1: ', callerAddr);
    console.log('Caller 2: ', caller2Addr);
    console.log('--');

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
    const MIM = await hre.ethers.getContractAt('IERC20', mimAddr);
    const crvTri = await hre.ethers.getContractAt('IERC20', crvTricrypto);
    const yvCrvTri = await hre.ethers.getContractAt('IYtri', yTricryptoPoolAddr);
    const FRAX = await hre.ethers.getContractAt('IERC20', fraxAddr);

    //Facets
    const diamondCutFacet = await deployFacet('DiamondCutFacet');
    const diamondLoupeFacet = await deployFacet('DiamondLoupeFacet'); 
    const managerFacet = await deployFacet('ManagerFacet');
    const gettersFacet = await deployFacet('GettersFacet');

    //Selectors
    const [
        selecCut,
        selecLoup,
        selecManager,
        selectGetters,
    ] = getSelectorsFromAllFacets([
        diamondCutFacet,
        diamondLoupeFacet,
        managerFacet,
        gettersFacet,
    ]);

    const contractsAddr = [
        managerFacet.address,
        tricryptoAddr,
        crvTricrypto,
        gettersFacet.address,
        renPoolAddr,
        mimPoolAddr,
        crv2PoolAddr,
        yTricryptoPoolAddr,
        fraxPoolAddr,
    ];

    const erc20sAddr = [
        usdtAddrArb,
        wbtcAddr,
        renBtcAddr,
        usdcAddr,
        mimAddr,
        wethAddr,
        fraxAddr,
    ];

    const appVars = [
        dappFee,
        slippageOnCurve,
        slippageTradingCurve
    ];

    //Data structs for init()
    const VarsAndAddrStruct = [
        contractsAddr,
        erc20sAddr,
        appVars,
        [tokenName, tokenSymbol],
        ETH
    ];

    const FacetsStruct = [
        [
            selecCut, 
            selecLoup, 
            selecManager, 
            selectGetters,
        ],
        [
            diamondCutFacet.address, 
            diamondLoupeFacet.address, 
            managerFacet.address,
            gettersFacet.address,
        ]
    ];


    //Deploy DiamondInit
    const DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();
    const functionCall = diamondInit.interface.encodeFunctionData('init', [
        FacetsStruct,
        VarsAndAddrStruct
    ]);

    //Deploys diamond
    const deployedDiamond = await diamond.deploy({
        diamondName: 'Diamond',
        facets: [
            ['DiamondCutFacet', diamondCutFacet],
            ['DiamondLoupeFacet', diamondLoupeFacet],
            ['ManagerFacet', managerFacet],
            ['GettersFacet', gettersFacet],
        ],
        args: '',
        overrides: {callerAddr, functionCall, diamondInit: diamondInit.address}
    });
    console.log('Diamond deployed to: ', deployedDiamond.address);

    return {
        deployedDiamond, 
        WETH,
        USDT,
        WBTC,
        renBTC,
        USDC,
        MIM,
        FRAX,
        crvTri,
        callerAddr, 
        caller2Addr,
        managerFacet,
        yvCrvTri
    };

}



module.exports = {
    deploy
};