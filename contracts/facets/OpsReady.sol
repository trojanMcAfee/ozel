// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {
    SafeERC20,
    IERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import '../interfaces/IOps.sol';




contract OpsReady {
    IOps opsGel;
    address payable public immutable gelato;
    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    modifier onlyOps() {
        require(msg.sender == address(opsGel), "OpsReady: onlyOps");
        _;
    }

    constructor(address _ops) {
        opsGel = IOps(_ops);
        gelato = opsGel.gelato();
    }

    function _transfer(uint256 _amount, address _paymentToken) internal {
        if (_paymentToken == ETH) {
            (bool success, ) = gelato.call{value: _amount}("");
            require(success, "_transfer: ETH transfer failed");
        } else {
            SafeERC20.safeTransfer(IERC20(_paymentToken), gelato, _amount);
        }
    }
}