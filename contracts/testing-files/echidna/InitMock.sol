pragma solidity 0.8.14;



contract InitMock {

    function doMath(uint x) public {
        uint num = 2 + x;
        if (num == 20) assert(false);
    }

}