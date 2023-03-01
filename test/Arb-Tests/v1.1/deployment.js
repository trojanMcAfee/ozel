const { diamondABI } = require("../../../scripts/state-vars");

const {
    deployContract
} = require('../../../scripts/helpers-eth');

const { getInitSelectors } = require('../../../scripts/helpers-arb');


async function main() {
    const ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);

    const [ ozMiddlewareAddr, ozMiddleware ] = await deployContract('ozMiddlewareL2', [ozlDiamond.address]);

    const [ beaconAddr, beacon ] = await deployContract('UpgradeableBeacon', [ ozMiddlewareAddr ]);

    let constrArgs = [beaconAddr];
    const [ factoryAddr, factory ] = await deployContract('ozProxyFactoryFacet', constrArgs);

    const newLoupe = await deployFacet('ozLoupeFacetV1_1');

    const [ innitAddr, init ] = await deployContract('InitUpgradeV1_1');
    const functionCall = init.interface.encodeFunctionData('init', [getInitSelectors()]);

    const facetCut = [
        [ factory.address, 0, getSelectors(factory) ],
        [ newLoupe.address, 0, getSelectors(newLoupe) ]
    ];

    const tx = await ozlDiamond.diamondCut(facetCut, innitAddr, functionCall);
    const receipt = await tx.wait();
    console.log('done: ', receipt.transactionHash);
}


main();