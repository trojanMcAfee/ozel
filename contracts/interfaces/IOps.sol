//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;



interface IOps {
    function createTaskNoPrepayment(
        address _execAddr,
        bytes4 _execSelector,
        address _resolverAddr,
        bytes calldata _resolverData,
        address _feeToken
    ) external returns(bytes32 task);

    function getFeeDetails() external view returns (uint256, address);
    function gelato() external view returns (address payable);
}