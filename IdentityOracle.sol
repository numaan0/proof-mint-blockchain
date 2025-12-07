// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract IdentityOracle {
    using ECDSA for bytes32;

    struct GigWorkProof {
        string utr;
        uint256 amountUSD;
        address worker;
        bool isVerified;
    }

    mapping(address => GigWorkProof) public proofs;
    
    // The address of your "Simulated FDC Node" (Your Backend's Wallet Address)
    // REPLACE THIS with the public address from your backend .env
    address public fdcNodeAddress; 

    event ProofVerified(address indexed worker, uint256 amountUSD);

    constructor(address _fdcNodeAddress) {
        fdcNodeAddress = _fdcNodeAddress;
    }

    // --- THE ON-CHAIN VERIFICATION ---
    // The USER calls this, sending the signature provided by the API.
    function submitProof(
        string memory _utr, 
        uint256 _amountUSD, 
        bytes memory _signature
    ) external {
        
        // 1. Recreate the "Hash" that the backend signed
        // We pack the data exactly how the backend did
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _utr, _amountUSD));
        
        // 2. Turn it into an Ethereum Signed Message Hash
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // 3. RECOVER the signer address from the signature
        address signer = ethSignedMessageHash.recover(_signature);

        // 4. VERIFY: Did our Trusted FDC Node sign this?
        require(signer == fdcNodeAddress, "Invalid FDC Signature");

        // 5. If passed, store the data (Trustless!)
        proofs[msg.sender] = GigWorkProof({
            utr: _utr,
            amountUSD: _amountUSD,
            worker: msg.sender,
            isVerified: true
        });

        emit ProofVerified(msg.sender, _amountUSD);
    }

    function getVerifiedIncome(address _worker) external view returns (uint256) {
        if (!proofs[_worker].isVerified) return 0;
        return proofs[_worker].amountUSD;
    }
}