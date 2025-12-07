// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProofMint {

    struct Proof {
        bytes32 fileHash;        // Hash of the raw screenshot file
        bytes32 metadataHash;    // Hash of the extracted metadata JSON
        address submittedBy;     // Wallet that submitted the proof
        uint256 timestamp;       // Blockchain timestamp of submission
    }

    uint256 public proofCount = 0;

    mapping(uint256 => Proof) public proofs;

    event ProofStored(
        uint256 indexed proofId,
        address indexed submittedBy,
        bytes32 fileHash,
        bytes32 metadataHash,
        uint256 timestamp
    );

    /**
     * @notice Store a hash-based proof of authenticity
     * @param fileHash - SHA256 hash of the screenshot file
     * @param metadataHash - SHA256 hash of metadata (resolution, exif, size, etc)
     * @return proofId - Unique ID of the proof stored on-chain
     */
    function storeProof(bytes32 fileHash, bytes32 metadataHash)
        external
        returns (uint256 proofId)
    {
        require(fileHash != bytes32(0), "Invalid file hash");
        require(metadataHash != bytes32(0), "Invalid metadata hash");

        proofCount += 1;
        proofId = proofCount;

        proofs[proofId] = Proof({
            fileHash: fileHash,
            metadataHash: metadataHash,
            submittedBy: msg.sender,
            timestamp: block.timestamp
        });

        emit ProofStored(proofId, msg.sender, fileHash, metadataHash, block.timestamp);
        return proofId;
    }

    /**
     * @notice Retrieve proof details
     * @param proofId - ID of stored proof
     */
    function getProof(uint256 proofId)
        external
        view
        returns (Proof memory)
    {
        require(proofId > 0 && proofId <= proofCount, "Invalid proof ID");
        return proofs[proofId];
    }
}
