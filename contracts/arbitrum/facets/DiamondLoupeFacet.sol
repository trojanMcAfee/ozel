// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/

import { LibDiamond } from  "../../libraries/LibDiamond.sol";
import { IDiamondLoupe } from "../../interfaces/IDiamondLoupe.sol";
import { IERC165 } from "../../interfaces/IERC165.sol";
import '../AppStorage.sol';

import '../../interfaces/IYtri.sol';
import {ITri} from '../../interfaces/ICurve.sol';
import "../../libraries/FixedPointMathLib.sol";
import '@openzeppelin/contracts/utils/Address.sol';

import 'hardhat/console.sol';

contract DiamondLoupeFacet is IDiamondLoupe, IERC165 { 

    AppStorage s;

    using FixedPointMathLib for uint;
    using Address for address;

    // Diamond Loupe Functions
    ////////////////////////////////////////////////////////////////////
    /// These functions are expected to be called frequently by tools.
    //
    // struct Facet {
    //     address facetAddress;
    //     bytes4[] functionSelectors;
    // }

    /// @notice Gets all facets and their selectors.
    /// @return facets_ Facet
    function facets() external override view returns (Facet[] memory facets_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        facets_ = new Facet[](numFacets);
        for (uint256 i; i < numFacets; i++) {
            address facetAddress_ = ds.facetAddresses[i];
            facets_[i].facetAddress = facetAddress_;
            facets_[i].functionSelectors = ds.facetFunctionSelectors[facetAddress_].functionSelectors;
        }
    }

    /// @notice Gets all the function selectors provided by a facet.
    /// @param _facet The facet address.
    /// @return facetFunctionSelectors_
    function facetFunctionSelectors(address _facet) external override view returns (bytes4[] memory facetFunctionSelectors_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetFunctionSelectors_ = ds.facetFunctionSelectors[_facet].functionSelectors;
    }

    /// @notice Get all the facet addresses used by a diamond.
    /// @return facetAddresses_
    function facetAddresses() external override view returns (address[] memory facetAddresses_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddresses_ = ds.facetAddresses;
    }

    /// @notice Gets the facet that supports the given selector.
    /// @dev If facet is not found return address(0).
    /// @param _functionSelector The function selector.
    /// @return facetAddress_ The facet address.
    function facetAddress(bytes4 _functionSelector) external override view returns (address facetAddress_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddress_ = ds.selectorToFacetAndPosition[_functionSelector].facetAddress;
    }

    // This implements ERC-165.
    function supportsInterface(bytes4 _interfaceId) external override view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[_interfaceId];
    }


    function queryTokenDatabase(address token_) external view returns(bool) {
        return s.tokenDatabase[token_];
    }

    function getOzelIndex() external view returns(uint) { 
        return s.ozelIndex;
    }

    function getRegulatorCounter() external view returns(uint) {
        return s.regulatorCounter;
    }

    function getTotalVolumeInETH() external view returns(uint) {
        return s.totalVolume;
    }

    function getTotalVolumeInUSD() external view returns(uint) {
        (,int price,,,) = s.priceFeed.latestRoundData();
        return (s.totalVolume * uint(price)) / 10 ** 8;
    }

    function getAUM(int price_) external view returns(uint yBalance, uint valueUM) { 
        (yBalance, ,valueUM) = _getAUM(price_);
    }

    function getAUM() public view returns(uint wethBalance, uint valueUM) { 
        (,int price,,,) = s.priceFeed.latestRoundData();
        (, wethBalance, valueUM) = _getAUM(price);
    }

    function getOzelBalances(address user_) external view returns(uint, uint) { //***** */        
        (uint wethBalance, uint valueUM) = getAUM();

        bytes memory data = abi.encodeWithSignature('balanceOf(address)', user_);
        bytes memory returnData = address(this).functionCall(data); // error
        uint ozlBalance = abi.decode(returnData, (uint));

        uint wethShare = ozlBalance.mulDivDown(wethBalance, 100);
        uint usdShare = ozlBalance.mulDivDown(valueUM, 100);
        return (wethShare, usdShare);
    }

    function _getAUM(int price_) private view returns(uint, uint, uint) {
        uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
        uint priceShare = IYtri(s.yTriPool).pricePerShare();

        uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
        uint wethBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
        uint valueUM = (wethBalance * uint(price_)) / 10 ** 8;
        return (yBalance, wethBalance, valueUM);
    }
}
