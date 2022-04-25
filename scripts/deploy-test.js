



const pYYFacet = '0x5B75d4318147D1E7B8c951C817e84A950E0D65B4';
const executorF = '0xbB3693F6587AaA189Ac9C4a7D729E4E1BA8Da6BC';
const diamond = '0x8FA2CE12C8fCa385C97Ef4320a781304E6CEc964';




async function main() {
    const signer = await hre.ethers.provider.getSigner(0);
    const signerAddr = await signer.getAddress();
    console.log('signer address: ', signerAddr);


    const iface = new ethers.utils.Interface(['function getHi()']);
    const data = iface.encodeFunctionData('getHi');
    console.log('data: ', data);

    const tx = await signer.sendTransaction({
        to: diamond,
        data,
        value: ethers.utils.parseEther('0.01')
    });
    const receipt = await tx.wait();
    console.log('receipt: ', receipt.transactionHash);



}





main();



