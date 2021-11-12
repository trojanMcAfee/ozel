//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import 'hardhat/console.sol';

import '../AppStorage.sol';


library Helpers {

    function diamondStorage() internal pure returns(AppStorage storage ds) {
        assembly {
            ds.slot := 0
        }
    }


    function _calculateSlippage(
        uint _amount, 
        uint _basisPoint //pass this as a general variable to the Diamond
    ) public pure returns(uint minAmountOut) {
        minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 ); //5 -> 0.05%; 
    }

    function delegateTo(
        address _callee, 
        string memory _signature,
        address _actionReceiver,
        uint _amount,
        string memory _contract,
        string memory _method
    ) external {
        (bool success, ) = _callee.delegatecall(
            abi.encodeWithSignature(_signature, _actionReceiver, _amount)
        );
        require(success, string(abi.encodePacked(_contract, ': ', _method, ' failed')));
    }


    function swapsRenForWBTC(uint _netAmount) public returns(uint wbtcAmount) {
        AppStorage storage s = diamondStorage();
        console.log('r: ', address(s.renBTC));
        console.log(13);
        console.log('msg.sender: ', msg.sender);
        console.log('address(this))): ', address(this));
        revert();
        console.log(15);
        // s.renBTC.approve(address(s.renPool), _netAmount); //original ***

        (bool x, ) = address(s.renBTC).call(
            abi.encodeWithSignature(
                'approve(address,uint256)', 
                address(s.renPool), _netAmount
            )
        );
        require(x, 'filll');

        console.log('allowance: ', s.renBTC.allowance(address(s.manager), address(s.renPool)));

        console.log(14);
        uint slippage = _calculateSlippage(_netAmount, 5); //pass this as a general variable to the Diamond
        console.log(11);
        revert('hereeee');

        s.renPool.exchange(0, 1, _netAmount, slippage);
        
        console.log(12);
        wbtcAmount = s.WBTC.balanceOf(address(this));
    }


    

}

abstract contract Exchange {

    function getVar(uint _netAmount) external {
        AppStorage storage s = Helpers.diamondStorage();
        
        console.log('msg.sender: ', msg.sender);
        console.log('address(this): ', address(this));

        s.renBTC.approve(address(s.renPool), _netAmount);
        console.log('allowance: ', s.renBTC.allowance(address(s.manager), address(s.renPool)));
        revert('fooozz');

    }

}