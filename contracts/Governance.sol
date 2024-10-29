// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Governance {
    event Voted(address voter, uint option);

    function voteChange(uint _option) public {
        // Governance logic to allow token holders to vote on changes
        emit Voted(msg.sender, _option);
    }
}
