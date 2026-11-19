// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts@5.0.2/access/Ownable.sol";

// One deployed contract is one election for one position.
contract CampusVoting is Ownable {
    struct Candidate {
        uint256 id;
        string name;
        string position;
        uint256 voteCount;
        bool exists;
    }

    uint256 public candidateCount;
    uint256 public totalVotes;
    uint256 public authorizedVoterCount;
    bool public electionOpen;
    bool public electionClosed;
    string public electionPosition;

    // These mappings are the authoritative registration, eligibility, and vote records.
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public registeredVoters;
    mapping(address => bool) public authorizedVoters;
    mapping(address => bool) public hasVoted;
    address[] private voterAddresses;

    event VoterRegistered(address indexed voter);
    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoterAuthorized(address indexed voter);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event ElectionStatusChanged(bool isOpen);

    constructor() Ownable(msg.sender) {}

    modifier duringSetup() {
        require(!electionOpen && !electionClosed, "Election setup has ended");
        _;
    }

    // Record the caller as registered during setup. Admin approval is a separate step.
    function registerVoter() external duringSetup {
        require(msg.sender != owner(), "Use a separate voter wallet");
        require(!registeredVoters[msg.sender], "Wallet is already registered");
        registeredVoters[msg.sender] = true;
        voterAddresses.push(msg.sender);
        emit VoterRegistered(msg.sender);
    }

    // Only the owner may add candidates. The first candidate fixes the election position.
    function addCandidate(string calldata _name, string calldata _position)
        external onlyOwner duringSetup
    {
        require(bytes(_name).length > 0 && bytes(_name).length <= 120, "Enter a candidate name (max 120 bytes)");
        require(bytes(_position).length > 0 && bytes(_position).length <= 120, "Enter a position (max 120 bytes)");
        if (candidateCount == 0) {
            electionPosition = _position;
        } else {
            require(keccak256(bytes(_position)) == keccak256(bytes(electionPosition)), "Use the same election position");
        }
        for (uint256 i = 1; i <= candidateCount; i++) {
            require(keccak256(bytes(candidates[i].name)) != keccak256(bytes(_name)), "Candidate already exists");
        }
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, _position, 0, true);
        emit CandidateAdded(candidateCount, _name);
    }

    // Approve a verified wallet. An address may also be registered directly by the owner.
    function authorizeVoter(address _voter) external onlyOwner duringSetup {
        require(_voter != address(0), "Invalid voter address");
        require(_voter != owner(), "Use a separate voter wallet");
        require(!authorizedVoters[_voter], "Voter is already authorized");
        // The admin may also register a verified address directly.
        if (!registeredVoters[_voter]) {
            registeredVoters[_voter] = true;
            voterAddresses.push(_voter);
            emit VoterRegistered(_voter);
        }
        authorizedVoters[_voter] = true;
        authorizedVoterCount++;
        emit VoterAuthorized(_voter);
    }

    // Require candidates and an approved voter, then permanently lock election setup.
    function startElection() external onlyOwner duringSetup {
        require(candidateCount >= 2, "Add at least two candidates");
        require(authorizedVoterCount > 0, "Authorize at least one voter");
        electionOpen = true;
        emit ElectionStatusChanged(true);
    }

    // Close voting permanently. The duringSetup modifier also prevents reopening.
    function endElection() external onlyOwner {
        require(electionOpen, "Election is not open");
        electionOpen = false;
        electionClosed = true;
        emit ElectionStatusChanged(false);
    }

    // Enforce eligibility and one vote per wallet on chain, then increment both vote counters.
    function vote(uint256 _candidateId) external {
        require(electionOpen, "Election is not open");
        require(authorizedVoters[msg.sender], "Your wallet is not authorized");
        require(!hasVoted[msg.sender], "Your vote is already recorded");
        require(candidates[_candidateId].exists, "Invalid candidate");
        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        totalVotes++;
        emit VoteCast(msg.sender, _candidateId);
    }

    // Return a candidate only when its ID exists.
    function getCandidate(uint256 _candidateId) external view returns (Candidate memory) {
        require(candidates[_candidateId].exists, "Invalid candidate");
        return candidates[_candidateId];
    }

    function getCandidateCount() external view returns (uint256) { return candidateCount; }
    function getTotalVotes() external view returns (uint256) { return totalVotes; }
    function getElectionStatus() external view returns (bool) { return electionOpen; }
    function getRegisteredVoters() external view returns (address[] memory) { return voterAddresses; }
}
