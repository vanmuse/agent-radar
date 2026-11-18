// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice TEST-ONLY mock of the Agent ID ERC-721. NOT part of the submission.
/// @notice Real contract: 0x60b9262456de011f7d15a54cdd8c48baaa8b022f on BSC.
/// @notice Only balanceOf is used by AgentRadar, so the mock only implements that.
contract MockAgentID {
    mapping(address => uint256) private _bal;

    function setBalance(address user, uint256 amount) external {
        _bal[user] = amount;
    }

    function balanceOf(address user) external view returns (uint256) {
        return _bal[user];
    }
}
