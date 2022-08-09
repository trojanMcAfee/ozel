// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;


import './oz20Facet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import './ExecutorFacet.sol';
import '../../libraries/FixedPointMathLib.sol';
import '../../Errors.sol';
import '../Modifiers.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import '@openzeppelin/contracts/utils/Address.sol';


/// @notice Original source: Minimal ERC4626 tokenized Vault implementation.
/// @author Original author: Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/mixins/ERC4626.sol)
contract oz4626Facet is Modifiers { 

    using FixedPointMathLib for uint256;
    using Address for address;

    /*///////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);

    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );


    /*///////////////////////////////////////////////////////////////
                        DEPOSIT/WITHDRAWAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function deposit(
        uint assets, 
        address receiver,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(1) returns (uint256 shares) {
        require((shares = previewDeposit(assets)) != 0, "ZERO_SHARES");

        //Mutex bitmap lock
        _toggleBit(1, 1); 

        bytes memory data = abi.encodeWithSignature(
            'updateExecutorState(uint256,address,uint256)', 
            assets, receiver, 1
        );

        LibDiamond.callFacet(data);

        emit Deposit(msg.sender, receiver, assets, shares);
    }


    function redeem(
        uint shares,
        address receiver,
        address owner,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(6) returns (uint256 assets) {
        require((assets = previewRedeem(shares)) != 0, "ZERO_ASSETS");

        //Mutex bitmap lock
        _toggleBit(1, 4);

        bytes memory data = abi.encodeWithSignature(
            'burn(address,uint256,uint256)', 
            owner, shares, 4
        );

        LibDiamond.callFacet(data);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /*///////////////////////////////////////////////////////////////
                           ACCOUNTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function convertToShares(uint256 assets) public view virtual returns (uint256) { 
        return s.ozelIndex == 0 ? 
            oz20Facet(s.oz20).totalSupply() : 
                s.ozelIndex.mulDivDown(assets * 100, 10 ** 22);
    }

    function convertToAssets(uint256 shares) public view virtual returns (uint256) { 
        uint vaultBalance = IERC20(s.yTriPool).balanceOf(address(this));
        uint assets = shares.mulDivDown(vaultBalance, 100 * 1 ether); 
        return assets;
    }

    function previewDeposit(uint256 assets) public view virtual returns (uint256) {
        return convertToShares(assets);
    }

    function previewRedeem(uint256 shares) public view virtual returns (uint256) {
        return convertToAssets(shares);
    }

    /*///////////////////////////////////////////////////////////////
                     DEPOSIT/WITHDRAWAL LIMIT LOGIC
    //////////////////////////////////////////////////////////////*/

    function maxDeposit(address) public view virtual returns (uint256) { 
        return type(uint256).max;
    }

    function maxMint(address) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address owner) public view virtual returns (uint256) {
        return convertToAssets(maxRedeem(owner));
    }

    function maxRedeem(address owner) public view virtual returns (uint256) {
        return oz20Facet(s.oz20).balanceOf(owner);
    }
}