// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRadar
/// @notice One unified contract for the Agent ID Hackathon (Binance Wallet x BNB Chain).
/// @notice Three modules in one contract: (1) Radar daily check-in, (2) Pay by Name,
///         (3) Squad (3-member teams, mirroring PodMint collab teams).
/// @notice Agent ID gate: an address must hold an Agent ID ERC-721
///         (0x60b9262456de011f7d15a54cdd8c48baaa8b022f on BNB Chain) to use it.
///         Gate is balanceOf(address) > 0 on that contract.
/// @notice NO owner power over user funds: there is no pause, mint, tax, withdraw,
///         fee, approval or custody function in this contract. Pay by Name forwards
///         100% of msg.value to the recipient in the same call. Direct plain
///         transfers are rejected by receive().
/// @notice No imports: single file, so BscScan source verification is trivial.

interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentRadar {
    address public immutable agentIdContract;
    address public owner;

    uint256 public totalCheckIns;
    uint256 public totalSquads;

    // ---- Radar: daily check-in ----
    mapping(address => uint256) public lastCheckInDay; // UTC day number
    mapping(address => uint256) public streak; // consecutive-day streak
    mapping(address => uint256) public userCheckIns;

    // ---- Pay by Name: opt-in registry ----
    // Only the holder of a name can register it, for themselves. This is NOT a
    // lookup tool for other people's wallets: nobody can register a name they
    // do not own, and resolution only works for names a holder opted in to publish.
    mapping(bytes32 => address) public nameOwner; // keccak256(name) -> address
    mapping(address => string) public addressName;
    mapping(address => bool) public hasName;

    // ---- Squad ----
    struct Squad {
        uint256 id;
        string name;
        address creator;
        address[] members;
        uint256 wins;
        uint256 losses;
        uint256 points;
        bool exists;
    }

    mapping(uint256 => Squad) private _squads;
    mapping(address => uint256) public memberSquad; // 0 = in no squad, else squad id (ids start at 1)

    event CheckIn(address indexed user, uint256 indexed day, uint256 streak);
    event NameRegistered(address indexed user, string name);
    event NameUpdated(address indexed user, string oldName, string newName);
    event Paid(address indexed from, address indexed to, string name, uint256 amount);
    event SquadCreated(uint256 indexed id, address indexed creator, string name);
    event SquadJoined(uint256 indexed id, address indexed member);
    event SquadLeft(uint256 indexed id, address indexed member);
    event SquadResult(uint256 indexed id, address indexed reporter, bool won, uint256 points);

    error NotAgentIdHolder();
    error AlreadyCheckedInToday();
    error NameTaken();
    error InvalidName();
    error NameNotRegistered();
    error CannotPaySelf();
    error ZeroValue();
    error PaymentFailed();
    error SquadNotFound();
    error AlreadyInSquad();
    error NotInSquad();
    error SquadFull();
    error NotSquadMember();

    modifier onlyHolder() {
        if (!isAgentIdHolder(msg.sender)) revert NotAgentIdHolder();
        _;
    }

    constructor(address _agentIdContract) {
        require(_agentIdContract != address(0), "agent id contract required");
        agentIdContract = _agentIdContract;
        owner = msg.sender;
    }

    // ---- Views ----

    function isAgentIdHolder(address user) public view returns (bool) {
        return IAgentID(agentIdContract).balanceOf(user) > 0;
    }

    function getStreak(address user)
        external
        view
        returns (uint256 currentStreak, uint256 total, uint256 lastDay)
    {
        return (streak[user], userCheckIns[user], lastCheckInDay[user]);
    }

    function resolveName(string calldata name) public view returns (address) {
        return nameOwner[keccak256(bytes(name))];
    }

    function getName(address user) external view returns (string memory) {
        return addressName[user];
    }

    function getSquad(uint256 id)
        external
        view
        returns (
            uint256 squadId,
            string memory name,
            address creator,
            address[] memory members,
            uint256 wins,
            uint256 losses,
            uint256 points
        )
    {
        Squad storage s = _squads[id];
        require(s.exists, "squad not found");
        return (s.id, s.name, s.creator, s.members, s.wins, s.losses, s.points);
    }

    // ---- (1) Radar: daily check-in ----

    function checkIn() external onlyHolder {
        uint256 day = block.timestamp / 1 days;
        if (lastCheckInDay[msg.sender] == day) revert AlreadyCheckedInToday();

        if (lastCheckInDay[msg.sender] == day - 1) {
            streak[msg.sender] += 1;
        } else {
            streak[msg.sender] = 1;
        }
        lastCheckInDay[msg.sender] = day;
        userCheckIns[msg.sender] += 1;
        totalCheckIns += 1;

        emit CheckIn(msg.sender, day, streak[msg.sender]);
    }

    // ---- (2) Pay by Name: opt-in registration ----

    function _validateName(string calldata name) internal pure {
        bytes calldata b = bytes(name);
        if (b.length < 3 || b.length > 32) revert InvalidName();
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) // a-z
                || (c >= 0x30 && c <= 0x39) // 0-9
                || c == 0x2e // .
                || c == 0x2d; // -
            if (!ok) revert InvalidName();
        }
    }

    function registerName(string calldata name) external onlyHolder {
        _validateName(name);
        bytes32 h = keccak256(bytes(name));
        address current = nameOwner[h];
        if (current != address(0) && current != msg.sender) revert NameTaken();

        if (hasName[msg.sender]) {
            string memory oldName = addressName[msg.sender];
            if (keccak256(bytes(oldName)) == h) {
                return; // re-registering the same name: no-op
            }
            delete nameOwner[keccak256(bytes(oldName))];
            addressName[msg.sender] = name;
            nameOwner[h] = msg.sender;
            emit NameUpdated(msg.sender, oldName, name);
        } else {
            addressName[msg.sender] = name;
            hasName[msg.sender] = true;
            nameOwner[h] = msg.sender;
            emit NameRegistered(msg.sender, name);
        }
    }

    function payByName(string calldata name) external payable {
        if (msg.value == 0) revert ZeroValue();
        address to = nameOwner[keccak256(bytes(name))];
        if (to == address(0)) revert NameNotRegistered();
        if (to == msg.sender) revert CannotPaySelf();
        (bool ok, ) = to.call{value: msg.value}("");
        if (!ok) revert PaymentFailed();
        emit Paid(msg.sender, to, name, msg.value);
    }

    // Reject accidental plain transfers: this contract never holds user funds.
    receive() external payable {
        revert("no direct payments");
    }

    fallback() external payable {
        revert("unknown call");
    }

    // ---- (3) Squad: 3-member teams ----

    function createSquad(string calldata name) external onlyHolder returns (uint256 id) {
        if (memberSquad[msg.sender] != 0) revert AlreadyInSquad();
        bytes memory b = bytes(name);
        require(b.length >= 1 && b.length <= 32, "invalid squad name");
        totalSquads += 1;
        id = totalSquads;
        Squad storage s = _squads[id];
        s.id = id;
        s.name = name;
        s.creator = msg.sender;
        s.members.push(msg.sender);
        s.exists = true;
        memberSquad[msg.sender] = id;
        emit SquadCreated(id, msg.sender, name);
    }

    function joinSquad(uint256 id) external onlyHolder {
        Squad storage s = _squads[id];
        if (!s.exists) revert SquadNotFound();
        if (memberSquad[msg.sender] != 0) revert AlreadyInSquad();
        if (s.members.length >= 3) revert SquadFull();
        s.members.push(msg.sender);
        memberSquad[msg.sender] = id;
        emit SquadJoined(id, msg.sender);
    }

    function leaveSquad() external {
        uint256 id = memberSquad[msg.sender];
        if (id == 0) revert NotInSquad();
        Squad storage s = _squads[id];
        uint256 len = s.members.length;
        for (uint256 i = 0; i < len; i++) {
            if (s.members[i] == msg.sender) {
                s.members[i] = s.members[len - 1];
                s.members.pop();
                break;
            }
        }
        delete memberSquad[msg.sender];
        emit SquadLeft(id, msg.sender);
    }

    function recordSquadResult(uint256 id, bool won, uint256 points) external {
        Squad storage s = _squads[id];
        if (!s.exists) revert SquadNotFound();
        if (memberSquad[msg.sender] != id) revert NotSquadMember();
        if (won) {
            s.wins += 1;
        } else {
            s.losses += 1;
        }
        s.points += points;
        emit SquadResult(id, msg.sender, won, points);
    }
}
