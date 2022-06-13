// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;


import './oz20Facet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './ExecutorF.sol';
import '../../libraries/FixedPointMathLib.sol';
import '../../Errors.sol';

/// @notice Original source: Minimal ERC4626 tokenized Vault implementation.
/// @author Original author: Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/mixins/ERC4626.sol)
contract oz4626Facet { 

    AppStorage s;

    modifier noReentrancy(uint lockNum_) {
        require(!(s.isLocked[lockNum_]), "oz4626Facet: No reentrance");
        s.isLocked[lockNum_] = true;
        _;
        s.isLocked[lockNum_]= false;
    }

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

    function deposit(uint256 assets, address receiver) external payable noReentrancy(1) returns (uint256 shares) {
        // Check for rounding error since we round down in previewDeposit.
        require((shares = previewDeposit(assets)) != 0, "ZERO_SHARES");

        (bool success, ) = s.executor.delegatecall(
            abi.encodeWithSignature(
                'updateExecutorState(uint256,address)', 
                assets, receiver
            )
        );
        // require(success, 'oz4626Facet: deposit() failed');
        if(!success) revert CallFailed('oz4626Facet: Failed to update Manager');

        emit Deposit(msg.sender, receiver, assets, shares);

        // afterDeposit(assets, shares);
    }


    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual returns (uint256 assets) {
        require((assets = previewRedeem(shares)) != 0, "ZERO_ASSETS");

        beforeWithdraw(assets, shares);

        (bool success, ) = s.oz20.delegatecall(
            abi.encodeWithSelector(
                oz20Facet(s.oz20)._burn.selector, 
                owner, shares
            )
        );
        require(success, 'oz4626Facet: redeem() failed');

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /*///////////////////////////////////////////////////////////////
                           ACCOUNTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function convertToShares(uint256 assets) public view virtual returns (uint256) { 
        return s.distributionIndex == 0 ? 
            oz20Facet(s.oz20).totalSupply() : 
                s.distributionIndex.mulDivDown(assets * 100, 10 ** 22);
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
        return convertToAssets(oz20Facet(s.oz20).balanceOf(owner));
    }

    function maxRedeem(address owner) public view virtual returns (uint256) {
        return oz20Facet(s.oz20).balanceOf(owner);
    }

    /*///////////////////////////////////////////////////////////////
                         INTERNAL HOOKS LOGIC
    //////////////////////////////////////////////////////////////*/

    function beforeWithdraw(uint256 assets, uint256 shares) internal virtual {}

    // function afterDeposit(uint256 assets, uint256 shares) internal virtual {}
}