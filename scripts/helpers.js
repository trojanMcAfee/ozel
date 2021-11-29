const { defaultAbiCoder: abiCoder } = ethers.utils;
const { MaxUint256 } = ethers.constants;


let deployedDiamond;
let PYY;
let managerFacet;
let renBTC;


async function getVarsForHelpers(diamond, pyy, manager, ren) {
    deployedDiamond = diamond;
    PYY = pyy;
    managerFacet = manager;
    renBTC = ren;
}

async function callDiamondProxy(params) { 
    const signers = await hre.ethers.getSigners();
    const signer = signers[!params.signerIndex ? 0 : params.signerIndex];
    const abi = [];
    let iface;
    let encodedData;
    const callArgs = [];
    let tx;
    let decodedData;
    let signature;
    const signatures = {
        getDistributionIndex: 'function getDistributionIndex() returns (uint256)',
        balanceOf: 'function balanceOf(address account) view returns (uint256)',
        transfer: 'function transfer(address recipient, uint256 amount) returns (bool)',
        exchangeToUserToken: 'function exchangeToUserToken(uint _amount, address _user, address _userToken)',
        withdrawUserShare: 'function withdrawUserShare(address _user, uint _userAllocation, address _userToken)'
    };

    for (let sign in signatures) {
        if (sign === params.method) {
            signature = signatures[sign];
        }
    }
    abi.push(signature);
    iface = new ethers.utils.Interface(abi);
    
    if (params.args) {
        if (Object.keys(params.args).length < 2) {
            callArgs[0] = params.args[Object.keys(params.args)[0]];
        } else {
            let i = 0;
            for (let key in params.args) {
                callArgs[i] = params.args[key];
                i++;
            }
        }
    }

    switch(!params.dir ? 0 : params.dir) {
        case 0: 
            encodedData = iface.encodeFunctionData(params.method, callArgs);
            const unsignedTx = {
                to: deployedDiamond.address,
                data: encodedData
            };
            if (callArgs.length === 1) {
                tx = await signer.call(unsignedTx);
                [ decodedData ] = abiCoder.decode([params.type], tx);
                return decodedData;
            } else {
                if (iface.fragments[0].name === 'exchangeToUserToken') {
                    const estGas = await signer.estimateGas(unsignedTx);
                    unsignedTx.gasLimit = Math.floor(estGas.toString() * 1.10);
                }
                await signer.sendTransaction(unsignedTx);
                return;
            }
        case 1:
            encodedData = iface.encodeFunctionData(params.method);
            tx = await signer.sendTransaction({
                to: deployedDiamond.address,
                data: encodedData
            });
            const receipt = await tx.wait();
            const { data } = receipt.logs[0];
            [ decodedData ] = abiCoder.decode([params.type], data);
            return decodedData;
    }
}

async function balanceOfPYY(user) {
    return await callDiamondProxy({
        method: 'balanceOf',
        args: {user},
        dir: 0,
        type: 'uint256'
    }); 
}

async function transferPYY(recipient, amount, signerIndex) { 
    await callDiamondProxy({
        method: 'transfer',
        args: {recipient, amount},
        signerIndex
    }); 
}

async function withdrawSharePYY(callerAddr, balancePYY, usdtAddr) {
    await callDiamondProxy({
        method: 'withdrawUserShare',
        args: {callerAddr, balancePYY, usdtAddr}
    });
}

async function approvePYY(caller) {
    const signer = await hre.ethers.provider.getSigner(caller);
    await PYY.connect(signer).approve(managerFacet.address, MaxUint256);
}

//Sends renBTC to contracts (simulates BTC bridging) ** MAIN FUNCTION **
async function sendsOneTenthRenBTC(oneTenth, userAddr, userToken, IERC20, tokenStr, decimals) {
    await renBTC.transfer(deployedDiamond.address, oneTenth);
    const balanceRenBTC = await renBTC.balanceOf(deployedDiamond.address);
    await callDiamondProxy({
        method: 'exchangeToUserToken',
        args: {balanceRenBTC, userAddr, userToken},
    });
    const distributionIndex = await callDiamondProxy({
        method: 'getDistributionIndex',
        dir: 1,
        type: 'uint256'
    });
    console.log('index: ', distributionIndex.toString() / 10 ** 18);
    let tokenBalance = await IERC20.balanceOf(userAddr);
    console.log(tokenStr + ' balance of callerAddr: ', tokenBalance.toString() / decimals);
    console.log('.'); 
}


module.exports = {
    balanceOfPYY,
    transferPYY,
    withdrawSharePYY,
    approvePYY, 
    getVarsForHelpers,
    sendsOneTenthRenBTC
};