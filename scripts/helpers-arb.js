const { defaultAbiCoder: abiCoder } = ethers.utils;
const { MaxUint256 } = ethers.constants;


let deployedDiamond;
let ozlFacet;


async function getVarsForHelpers(diamond, ozl) { 
    deployedDiamond = diamond;
    ozlFacet = ozl;
}

async function callDiamondProxy(params) { 
    const signers = await hre.ethers.getSigners();
    const signer = signers[!params.signerIndex ? 0 : params.signerIndex];
    const abi = [];
    let callArgs = [];
    let iface;
    let encodedData;
    let tx;
    let decodedData;
    let signature;
    const signatures = {
        getDistributionIndex: 'function getDistributionIndex() returns (uint256)',
        balanceOf: 'function balanceOf(address account) view returns (uint256)',
        transfer: 'function transfer(address recipient, uint256 amount) returns (bool)',
        exchangeToUserToken: 'function exchangeToUserToken(tuple(address user, address userToken, uint userSlippage) userDetails_)', 
        withdrawUserShare: 'function withdrawUserShare(tuple(address user, address userToken, uint userSlippage) userDetails_, address receiver, uint shares_)'  
    }; 

    for (let sign in signatures) {
        if (sign === params.method) {
            signature = signatures[sign];
        }
    }
    abi.push(signature);
    iface = new ethers.utils.Interface(abi);


    switch(!params.dir ? 0 : params.dir) {
        case 0: 
           const args = params.args;
            switch(true) {
                case args.length === 2:
                    callArgs = [...args];
                    break;
                case typeof args[0] === 'object':
                    for (let i=0; i < args.length; i++) callArgs.push(args[i]);
                    break;
                default:
                    callArgs.push(args);
            }

            encodedData = iface.encodeFunctionData(params.method, callArgs);
            const unsignedTx = {
                to: deployedDiamond.address,
                data: encodedData,
                value: params.value
            };
            if (typeof params.args === 'string') { 
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

async function balanceOfOZL(user) {
    return await callDiamondProxy({
        method: 'balanceOf',
        args: user,
        dir: 0,
        type: 'uint256'
    }); 
}

async function transferOZL(recipient, amount, signerIndex) { 
    await callDiamondProxy({
        method: 'transfer',
        args: [recipient, amount],
        signerIndex
    }); 
}

async function withdrawShareOZL(userConfig, receiverAddr, balanceOZL, signerIndex) {  
    await callDiamondProxy({
        method: 'withdrawUserShare',
        args: [userConfig, receiverAddr, balanceOZL],
        signerIndex
    });
} 


//Sends ETH to contracts (simulates ETH bridging) **** MAIN FUNCTION ****
async function sendETH(userConfig, IERC20, tokenStr, decimals, signerIndex) {
    const value = ethers.utils.parseEther('100');
    await callDiamondProxy({
        method: 'exchangeToUserToken',
        args: userConfig, //an array now - before: {userAddr, userToken}, + userSlippage
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
        exchangeToUserToken: 'function exchangeToUserToken(tuple(address user, address userToken, uint userSlippage) userDetails_)',
        sendToArb: 'function sendToArb(tuple(address user, address userToken, uint userSlippage) userDetails_, uint256 _callvalue) returns (uint256)'
    };
    const abi = [];
    abi.push(signatures[method]);
    const iface = new ethers.utils.Interface(abi);
    const data = iface.encodeFunctionData(method, params);
    return data;
} 




module.exports = {
    balanceOfOZL,
    transferOZL,
    withdrawShareOZL,
    getVarsForHelpers,
    sendETH,
    getCalldata
};