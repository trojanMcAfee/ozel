const { assert } = require("chai");
const diamond = require('diamond-util');
const { getSelectors } = require('../scripts/libraries/diamond.js');
const { parseEther, formatEther, keccak256 } = ethers.utils;




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


describe("PayMe app", function () {
  async function deployFacet(facetName, withLib, libDeployed) {
    let Contract, library;
    if (withLib) {
      library = !libDeployed ? await deployFacet(withLib) : libDeployed;
      Contract = await hre.ethers.getContractFactory(facetName, {
          libraries: {
              Helpers: library.address 
          }
      });
    } else {
        Contract = await hre.ethers.getContractFactory(facetName);
    }
    const contract = await Contract.deploy();
    await contract.deployed();
    console.log(`${facetName} deployed to: `, contract.address);
    return withLib && !libDeployed ? [contract, library] : contract;
  }

  async function runFallback(method) {
    function utf8ToHex(str) {
        return '0x' + Array.from(str).map(c =>
          c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) :
          encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
        ).join('');
    }
    
    const sigHex = utf8ToHex(method);
    const signature = keccak256(sigHex).substr(0, 10);

    await signer.sendTransaction({
        to: deployedDiamond.address,
        data: signature
    });
}

  let signers, signer, callerAddr;
  let diamondCutFacet, diamondLoupeFacet, dummyFacet, managerFacet, vaultFacet, PYY;
  let selecCut, selecLoup, selecDummy;
  let tokenName, tokenSymbol, contractsAddr, erc20sAddr, appVars;
  let VarsAndAddrStruct, FacetsStruct;
  let DiamondInit, diamondInit, deployedDiamond;
  let functionCall, library;

  let LibDiamond, libDiamond;

  before(async () => {
    signers = await hre.ethers.getSigners();
    signer = signers[0];
    callerAddr = await signer.getAddress();

    //Facets
    diamondCutFacet = await deployFacet('DiamondCutFacet');
    diamondLoupeFacet = await deployFacet('DiamondLoupeFacet');
    dummyFacet = await deployFacet('DummyFacet');
    
    [managerFacet, library] = await deployFacet('ManagerFacet', 'Helpers');
    vaultFacet = await deployFacet('VaultFacet', 'Helpers', library);
    PYY = await deployFacet('PayTokenFacet'); 

    //Selectors
    selecCut = getSelectors(diamondCutFacet).filter((el, i) => i <= 4);
    selecLoup = getSelectors(diamondLoupeFacet).filter((el, i) => i <= 4);
    selecDummy = getSelectors(dummyFacet).filter((el, i) => i <= 1);

    //State variables
    tokenName = 'PayToken';
    tokenSymbol = 'PYY';

    contractsAddr = [
      registryAddr,
      managerFacet.address,
      tricryptoAddr,
      vaultFacet.address,
      renPoolAddr,
      crvTricrypto
    ];

    erc20sAddr = [
      renBtcAddr,
      usdtAddr,
      wethAddr,
      wbtcAddr,
      PYY.address
    ];
    
    appVars = [dappFee,slippageOnCurve];

    //Data structs for init()
    VarsAndAddrStruct = [
      contractsAddr,
      erc20sAddr,
      appVars,
      [tokenName, tokenSymbol],
      ETH
    ];

    FacetsStruct = [
      [selecCut, selecLoup, selecDummy],
      [diamondCutFacet.address, diamondLoupeFacet.address, dummyFacet.address]
    ];

    //Deploys DiamondInit
    DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();
    functionCall = diamondInit.interface.encodeFunctionData('init', [
        FacetsStruct,
        VarsAndAddrStruct
    ]);

    //Deploys diamond
    deployedDiamond = await diamond.deploy({
      diamondName: 'Diamond',
      facets: [
          ['DiamondCutFacet', diamondCutFacet],
          ['DiamondLoupeFacet', diamondLoupeFacet],
          ['DummyFacet', dummyFacet]
      ],
      args: '',
      overrides: {callerAddr, functionCall, diamondInit: diamondInit.address}
    });
    console.log('Diamond deployed to: ', deployedDiamond.address);

    //Deploys LibDimaond
    LibDimaond = await hre.ethers.getContractFactory('LibDiamond');
    libDiamond = await LibDimaond.deploy();
    await libDiamond.deployed();
  });


    
  it("should log deposit message", async function () {
    console.log('caller: ', callerAddr);
    runFallback('getOwner()');

    // const x = libDiamond.diamondStorage();
    // console.log('x: ', x);


  });
});
