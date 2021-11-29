const diamond = require('diamond-util');
const { getSelectors } = require('./libraries/diamond.js');

const {
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
    tokenSymbol
} = require('./state-vars.js');


async function deployFacet(facetName, withLib, libDeployed) {
    let Contract, library;
    if (withLib) {
        library = !libDeployed ? await deployFacet(withLib) : libDeployed;
        const lb = {};
        lb[withLib] = library.address;
        Contract = await hre.ethers.getContractFactory(facetName, {
            libraries: lb
        });
    } else {
        Contract = await hre.ethers.getContractFactory(facetName);
    }
    const contract = await Contract.deploy();
    await contract.deployed();
    console.log(`${facetName} deployed to: `, contract.address);
    return withLib && !libDeployed ? [contract, library] : contract;
}


async function deploy() {

    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    console.log('--');
    console.log('Caller 1: ', callerAddr);
    console.log('Caller 2: ', caller2Addr);
    console.log('--');

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const crvTri = await hre.ethers.getContractAt('IERC20', crvTricrypto);

    //Facets
    const diamondCutFacet = await deployFacet('DiamondCutFacet');
    const diamondLoupeFacet = await deployFacet('DiamondLoupeFacet'); 
    const dummyFacet = await deployFacet('DummyFacet');

    const [managerFacet, library] = await deployFacet('ManagerFacet', 'Helpers');
    const vaultFacet = await deployFacet('VaultFacet', 'Helpers', library);
    const paymeFacet = await deployFacet('PayMeFacet');
    const PYY = await deployFacet('PayTokenFacet'); 
    const gettersFacet = await deployFacet('GettersFacet');


    //Selectors
    const selecCut = getSelectors(diamondCutFacet).filter((el) => typeof el === 'string');
    const selecLoup = getSelectors(diamondLoupeFacet).filter((el) => typeof el === 'string');
    const selecDummy = getSelectors(dummyFacet).filter((el) => typeof el === 'string');

    const selecPayme = getSelectors(paymeFacet).filter((el) => typeof el === 'string');
    const selecManager = getSelectors(managerFacet).filter((el) => typeof el === 'string');
    const selecPYY = getSelectors(PYY).filter((el) => typeof el === 'string');
    const selectGetters = getSelectors(gettersFacet).filter((el) => typeof el === 'string');
    const selecVault = getSelectors(vaultFacet).filter((el) => typeof el === 'string');

    const contractsAddr = [
        registryAddr,
        managerFacet.address,
        tricryptoAddr,
        vaultFacet.address,
        renPoolAddr,
        crvTricrypto,
        paymeFacet.address,
        gettersFacet.address
    ];

    const erc20sAddr = [
        renBtcAddr,
        usdtAddr,
        wethAddr,
        wbtcAddr,
        PYY.address
    ];

    const appVars = [
        dappFee,
        slippageOnCurve
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
            selecDummy, 
            selecPayme, 
            selecManager, 
            selecPYY,
            selectGetters,
            selecVault
        ],
        [
            diamondCutFacet.address, 
            diamondLoupeFacet.address, 
            dummyFacet.address,
            paymeFacet.address,
            managerFacet.address,
            PYY.address,
            gettersFacet.address,
            vaultFacet.address
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
            ['DummyFacet', dummyFacet],
            ['PayMeFacet', paymeFacet],
            ['ManagerFacet', managerFacet],
            ['PayTokenFacet', PYY],
            ['GettersFacet', gettersFacet],
            ['VaultFacet', vaultFacet]
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
        crvTri,
        callerAddr, 
        caller2Addr,
        PYY,
        managerFacet
    };

}



module.exports = {
    deploy
};