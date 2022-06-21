//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import '@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol';
import { LibDiamond } from "../libraries/LibDiamond.sol";
import './AppStorage.sol';


abstract contract Modifiers {

    AppStorage s;

    modifier noReentrancy(uint lockNum_) {
        require(!(s.isLocked[lockNum_]), "No reentrance");
        s.isLocked[lockNum_] = true;
        _;
        s.isLocked[lockNum_]= false;
    }


    modifier isAuthorized(uint lockNum_) {
        require(s.isAuth[lockNum_], "No authorized");
        _;
        s.isAuth[lockNum_]= false;
    }


    modifier onlyWhenEnabled() {
        require(s.isEnabled, 'Operation not enabled');
        _;
    }

}