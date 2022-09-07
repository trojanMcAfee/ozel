pragma solidity 0.8.14;



contract TestEch {
    function getNum() external payable {
        require(msg.value > 0);
        assert(true);
    }
}