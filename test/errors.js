


function err() {
    return {
        alreadyInitialized: "VM Exception while processing transaction: reverted with reason string 'Initializable: contract is already initialized'",
        onlyOps: "VM Exception while processing transaction: reverted with reason string 'ozPayMe: onlyOps'",
        notAuthorized: "VM Exception while processing transaction: reverted with reason string 'ozPayMe: Not authorized'",
        notProxy: "VM Exception while processing transaction: reverted with custom error 'NotProxy()'",
        notOwner: "VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
    };


} 


module.exports = {
    err
};