pragma solidity 0.8.14;



contract TestEch {

    uint x;

    function testing(uint num_) public {
        require(num_ == 23);

        x = num_;   
        // assert(true);
    }


}