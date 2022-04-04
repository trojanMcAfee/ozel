// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import '../pyERC20/pyERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeTransferLib} from "./SafeTransferLib.sol";
import '../ExecutorF.sol';
import '../../libraries/FixedPointMathLib.sol';

/// @notice Minimal ERC4626 tokenized Vault implementation.
/// @author Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/mixins/ERC4626.sol)
contract pyERC4626 { 

    AppStorage s;

    using SafeTransferLib for pyERC20;
    using FixedPointMathLib for uint256;

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

    function deposit(uint256 assets, address receiver) public virtual payable returns (uint256 shares) {
        // Check for rounding error since we round down in previewDeposit.
        require((shares = previewDeposit(assets)) != 0, "ZERO_SHARES");

        // Need to transfer before minting or ERC777s could reenter. <-----------------------------

        (bool success, ) = s.executor.delegatecall(
            abi.encodeWithSignature(
                'updateManagerState(uint256,address)', 
                assets, receiver
            )
        );
        require(success, 'pyERC4626: deposit() failed');

        emit Deposit(msg.sender, receiver, assets, shares);

        afterDeposit(assets, shares);
    }


    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual returns (uint256 assets) {
        if (msg.sender != owner) {
            uint256 allowed = s.py[true]._allowances[owner][msg.sender]; // Saves gas for limited approvals.

            if (allowed != type(uint256).max) s.py[true]._allowances[owner][msg.sender] = allowed - shares;
        }
        // Check for rounding error since we round down in previewRedeem.
        require((assets = previewRedeem(shares)) != 0, "ZERO_ASSETS");

        beforeWithdraw(assets, shares);

        (bool success, ) = s.py20.delegatecall(
            abi.encodeWithSelector(
                pyERC20(s.py20)._burn.selector, 
                owner, shares
            )
        );
        require(success, 'pyERC4626: redeem() failed');

        emit Withdraw(msg.sender, receiver, owner, assets, shares);

        if (receiver != owner) {
            // asset.safeTransfer(receiver, assets); // <------ code and test when the receiver is not the same as the owner
        }

    }

    /*///////////////////////////////////////////////////////////////
                           ACCOUNTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function convertToShares(uint256 assets) public view virtual returns (uint256) { 
        // <------- code the dynamic totalSupply instead of 100, and check for the same erros in convertToAssets()
        return s.distributionIndex == 0 ? 100 : s.distributionIndex.mulDivDown(assets * 100, 10 ** 22);
    }

    function convertToAssets(uint256 shares) public view virtual returns (uint256) {
        uint vaultBalance = IERC20(s.crvTricrypto).balanceOf(address(this));
        uint assets = ((shares * vaultBalance) / 100 * 1 ether) / 10 ** 36; //<----problem is here and pyerc20

        console.log(1);
        console.log('y: ', ((shares * vaultBalance) / 100 * 1 ether) / 10 ** 36);
        // uint256 assets = shares.mulDivDown(vaultBalance, 100 * 1 ether) / 10 ** 36;
        console.log('assets in convertToAssets: ', assets);
        console.log(2);
        
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
        return convertToAssets(pyERC20(s.py20).balanceOf(owner));
    }

    function maxRedeem(address owner) public view virtual returns (uint256) {
        return pyERC20(s.py20).balanceOf(owner);
    }

    /*///////////////////////////////////////////////////////////////
                         INTERNAL HOOKS LOGIC
    //////////////////////////////////////////////////////////////*/

    function beforeWithdraw(uint256 assets, uint256 shares) internal virtual {}

    function afterDeposit(uint256 assets, uint256 shares) internal virtual {}
}