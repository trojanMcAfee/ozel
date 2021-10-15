//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool} from './interfaces/ICurve.sol';



contract Vault {

    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);
    IERC20 WBTC = IERC20(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    IRenPool renPool = IRenPool(0x93054188d876f558f4a66B2EF1d97d16eDf0895B);
    
    uint slippage = 100; //bp: 100 -> 1%


    function getTokenBalance(address _token) public view returns(uint balance) {
        balance = IERC20(_token).balanceOf(address(this));
    }

    // function _calculateTokenAmountCurve() private returns(uint tokenAmount) {
    //     uint[] memory amounts = new uint[](2);
    //     amounts[0] = 0;
    //     amounts[1] = wbtcAmountIn;

    // }

    // function depositInCurve() public {
    //     uint wbtcAmountIn = WBTC.balanceOf(address(this));
        
    //     renPool.calc_token_amount();


    //     function calc_token_amount(uint256[2] calldata amounts, bool deposit) external returns(uint256);


    // }

} 
