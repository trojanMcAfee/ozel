pragma solidity 0.8.14;


import { IDiamondCut } from "../../interfaces/IDiamondCut.sol";



library LibDiamondMock {

    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        initializeDiamondCut(_init, _calldata);
    }

    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        require(success, 'faillled');  
    }

    function setContractOwner(address owner_) internal {}

    function setNonRevenueFacets(address[] memory facets_) internal {}


}