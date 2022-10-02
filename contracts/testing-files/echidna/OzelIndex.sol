// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


// struct TradeOps {
//     int128 tokenIn;
//     int128 tokenOut;
//     address baseToken;
//     address userToken;  
//     address pool;
// }


// import '../arbitrum/ExecutorFacetTest.sol';
// import '../arbitrum/OZLFacetTest.sol';
// import '../../Errors.sol';
import './TestEch.sol';






contract ExchangeUserToken_Echidna { //is OZLFacetTest 

    event AssertionFailed(uint);

    // struct UserConfig { 
    //     address user;
    //     address userToken;
    //     uint userSlippage; 
    // }

    // modifier filterDetails(UserConfig calldata userDetails_) {
    //     if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address'); 
    //     if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
    //     _;
    // }

    // function exchangeUserToken_never_reverts2(
    //     UserConfig memory userDetails_
    // ) public filterDetails(userDetails_) {
    //     assert(false);
    // }

    // constructor(
    //     IDiamondCut.FacetCut[] memory _diamondCut, 
    //     address _contractOwner, 
    //     bytes memory _functionCall, 
    //     address _init,
    //     address[] memory nonRevenueFacets_
    // ) Diamond(
    //     _diamondCut, 
    //     _contractOwner, 
    //      _functionCall, 
    //     _init,
    //     nonRevenueFacets_
    // ) {}

    // uint num3 = setNum();

    // constructor() {}


    // function exchangeUserToken_never_reverts2(uint num_) public {
    //     (bool success, ) = address(this).call(
    //         abi.encodeWithSignature('testing(uint256)', num_)
    //     );
    //     require(success);
    // }

    // function setNum() internal returns(uint) {
    //     return 23;
    // }

    function testing() public payable {
        // require(num_ == 1 ether);

        TestEch t = new TestEch();
        // t.getNum();

        (bool success, ) = address(t).delegatecall(
            abi.encodeWithSelector(t.getNum.selector)
        );
        assert(success);
    }


}


contract CallTest {

    function callIt() external payable {
        ExchangeUserToken_Echidna cont = new ExchangeUserToken_Echidna();
        cont.testing();
    }
}




//----------------

contract C {

    mapping(address => bool) tokenDatabase;

    constructor(address usdt) {
        tokenDatabase[usdt] = true;
    }

}


contract A is C {

    address USDT = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;

   struct UserConfig { 
      address user;
      address userToken;
      uint userSlippage; 
   }
   
   constructor() C(USDT) {}

   modifier filterDetails(UserConfig calldata userDetails_) {
        require(userDetails_.user != address(0)); 
        require(userDetails_.userToken != address(0));
        require(userDetails_.userSlippage > 0);
        require(tokenDatabase[userDetails_.userToken]); // <---- commenting this out makes test() from below fails (expected)
        _;
    }

   function test(UserConfig calldata userDetails_) public filterDetails(userDetails_) {
        B b = new B();
        b.testContractB(userDetails_); // <----- passes (it should fail)
    }

   function test_tokenDb() public { // <------- fails in echidna (expected - proves that s.tokenDatabase was configured properly)
        // address USDT = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
        if (tokenDatabase[USDT]) {
            assert(false);
        } else {
            assert(true);
        }
    }
}

contract B {
   function testContractB(
        A.UserConfig calldata userDetails_
    ) external {
        assert(false);
    }
}


contract D {

    function testing() public payable {
        TestEch t = new TestEch();
        bytes memory data = abi.encodeWithSignature('getNum()');

        (bool success, ) = payable(address(t)).call{value: 1 ether}(data);
        assert(success);
    }

}










