pragma solidity 0.8.14;



contract TestEch {

    uint x;
    
    constructor(uint num2_) {
        x = num2_;
    }

    function testing(uint num_) public {
        // require(num_ == 23);

        if (x == 23 && num_ == 23) assert(false);   
        
    }

    function setNums() public returns(uint, uint) {
        return (1, 3);
    }


}