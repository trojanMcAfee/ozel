pragma solidity 0.8.14;



contract RedeemedHashes {

    mapping(bytes32 => mapping (bytes32 => bool)) taskIdToHashes;

    function getRedeemedHashes(bytes32 taskId_) external view {
        return 
    }


}