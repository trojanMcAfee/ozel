const { defaultAbiCoder: abiCoder } = ethers.utils;
const { MaxUint256 } = ethers.constants;


let deployedDiamond;
let pyyFacet;


async function getVarsForHelpers(diamond, pyy) { 
    deployedDiamond = diamond;
    pyyFacet = pyy;
}

async function callDiamondProxy(params) { 
    const signers = await hre.ethers.getSigners();
    const signer = signers[!params.signerIndex ? 0 : params.signerIndex];
    const abi = [];
    let iface;
    let encodedData;
    // const callArgs = [];
    let tx;
    let decodedData;
    let signature;
    const signatures = {
        getDistributionIndex: 'function getDistributionIndex() returns (uint256)',
        balanceOf: 'function balanceOf(address account) view returns (uint256)',
        transfer: 'function transfer(address recipient, uint256 amount) returns (bool)',
        exchangeToUserToken: 'function exchangeToUserToken(tuple(address user, address userToken, uint slipPref) userDetails_)', //'function exchangeToUserToken(address _user, address _userToken)'
        withdrawUserShare: 'function withdrawUserShare(address user, address receiver, uint shares, address userToken)'
    }; 

    for (let sign in signatures) {
        if (sign === params.method) {
            signature = signatures[sign];
        }
    }
    abi.push(signature);
    iface = new ethers.utils.Interface(abi);
    
    // if (params.args) {
    //     if (Object.keys(params.args).length < 2) {
    //         callArgs[0] = params.args[Object.keys(params.args)[0]];
    //     } else {
    //         let i = 0;
    //         for (let key in params.args) {
    //             callArgs[i] = params.args[key];
    //             i++;
    //         }
    //     }
    // }

    switch(!params.dir ? 0 : params.dir) {
        case 0: 
            encodedData = iface.encodeFunctionData(params.method, [params.args]);
            const unsignedTx = {
                to: deployedDiamond.address,
                data: encodedData,
                value: params.value
            };
            if (params.args.length === 1) {
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

async function withdrawSharePYY(callerAddr, receiverAddr, balancePYY, userToken, signerIndex) { 
    await callDiamondProxy({
        method: 'withdrawUserShare',
        args: {callerAddr, receiverAddr, balancePYY, userToken},
        signerIndex
    });
} 


//Sends ETH to contracts (simulates ETH bridging) **** MAIN FUNCTION ****
async function sendETH(userConfig, IERC20, tokenStr, decimals, signerIndex) {
    const value = ethers.utils.parseEther('100');
    await callDiamondProxy({
        method: 'exchangeToUserToken',
        args: userConfig, //an array now - before: {userAddr, userToken}, + userSlip
        value,
        signerIndex
    });

    const distributionIndex = await callDiamondProxy({
        method: 'getDistributionIndex',
        dir: 1,
        type: 'uint256'
    });
    console.log('index: ', distributionIndex.toString() / 10 ** 18);
    let tokenBalance = await IERC20.balanceOf(userConfig[0]);
    console.log(tokenStr + ' balance of callerAddr: ', tokenBalance.toString() / decimals);
    console.log('.'); 
}


async function getCalldata(method, params) {
    const signatures = {
        exchangeToUserToken: 'function exchangeToUserToken(address _user, address _userToken)',
        sendToArb: 'function sendToArb(address _userToken, uint256 _callvalue) returns (uint256)'
    };
    const abi = [];
    abi.push(signatures[method]);
    const iface = new ethers.utils.Interface(abi);
    const data = iface.encodeFunctionData(method, params);
    return data;
} 




module.exports = {
    balanceOfPYY,
    transferPYY,
    withdrawSharePYY,
    getVarsForHelpers,
    sendETH,
    getCalldata
};