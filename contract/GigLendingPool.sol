// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// FTSO V2 Interface
interface IFtsoV2 {
    function getFeedById(bytes21 _feedId) external view returns (uint256 value, int8 decimals, uint64 timestamp);
}

contract GigLendingPool {
    
    // --- 1. FLARE CONFIG ---
    address public constant FTSO_V2_ADDRESS = 0x3d893C53D9e8056135C26C8c638B76C8b60Df726; 
    bytes21 public constant FLR_USD_ID = 0x01464c522f55534400000000000000000000000000; 

    // --- 2. STATE ---
    address public platformSigner; 
    uint256 public constant MAX_LOAN_CAP = 4 ether; 
    uint256 public constant INTEREST_RATE = 5; // 5% Interest

    uint256 public totalLiquidity; 
    uint256 public totalShares;    

    struct WorkerProfile {
        uint256 lifetimeEarnings; 
        uint256 reviewScore;      
        uint256 tenureMonths;
        bool isDataVerified;
        bool hasActiveLoan;
        uint256 loanAmount; 
    }

    mapping(address => bool) public isLender;
    mapping(address => bool) public isBorrower;
    mapping(address => WorkerProfile) public profiles;
    mapping(address => uint256) public shares; 
    
    // FIX 1: Added missing Nonces mapping
    mapping(address => uint256) public nonces; 

    event LoanTaken(address indexed borrower, uint256 amount);
    event LoanRepaid(address indexed borrower, uint256 amountPaid, uint256 interestPaid);
    event DepositReceived(address indexed lender, uint256 amount, uint256 sharesMinted);
    event Withdrawal(address indexed lender, uint256 amountFLR, uint256 sharesBurned);
    event DataSynced(address indexed worker, uint256 earnings, uint256 score);

    constructor(address _platformSigner) {
        platformSigner = _platformSigner;
        isLender[msg.sender] = true;
    }

    modifier onlyAdmin() {
        require(msg.sender == platformSigner, "Only Admin");
        _;
    }

    function setRole(address _user, string memory _role) external onlyAdmin {
        bytes32 roleHash = keccak256(bytes(_role));
        if (roleHash == keccak256(bytes("lender"))) isLender[_user] = true;
        else if (roleHash == keccak256(bytes("borrower"))) isBorrower[_user] = true;
    }

    // --- 3. DEPOSIT ---
    function deposit() external payable {
        require(isLender[msg.sender], "Not a lender");
        require(msg.value > 0, "Zero deposit");

        uint256 sharesToMint;
        if (totalShares == 0) {
            sharesToMint = msg.value; 
        } else {
            sharesToMint = (msg.value * totalShares) / totalLiquidity;
        }

        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;
        totalLiquidity += msg.value;

        emit DepositReceived(msg.sender, msg.value, sharesToMint);
    }

    // --- 4. WITHDRAW ---
    function withdraw(uint256 _sharesToBurn) external {
        require(isLender[msg.sender], "Not a lender");
        require(shares[msg.sender] >= _sharesToBurn, "Not enough shares");
        require(_sharesToBurn > 0, "Zero withdraw");

        uint256 amountToSend = (_sharesToBurn * totalLiquidity) / totalShares;
        require(address(this).balance >= amountToSend, "Liquidity Low");

        shares[msg.sender] -= _sharesToBurn;
        totalShares -= _sharesToBurn;
        totalLiquidity -= amountToSend;

        payable(msg.sender).transfer(amountToSend);
        emit Withdrawal(msg.sender, amountToSend, _sharesToBurn);
    }

    // --- 5. STANDARD BORROW ---
    function borrow() external {
        // Calls the shared logic
        _executeBorrow(msg.sender);
    }

    // --- 6. GASLESS BORROW ---
    function borrowGasless(address _user, uint256 _deadline, bytes memory _signature) external onlyAdmin {
        require(block.timestamp <= _deadline, "Signature expired");
        
        bytes32 messageHash = keccak256(abi.encodePacked(_user, nonces[_user], _deadline, "BORROW"));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedMessageHash, _signature);
        
        require(signer == _user, "Invalid User Signature");
        nonces[_user]++; 
        
        // Calls the shared logic
        _executeBorrow(_user);
    }

    // FIX 2: Added the Shared Helper Function
    function _executeBorrow(address _user) internal {
        require(isBorrower[_user], "Not a borrower");
        require(profiles[_user].isDataVerified, "Sync data first");
        require(!profiles[_user].hasActiveLoan, "Active loan exists");
        require(profiles[_user].reviewScore >= 40, "Score too low"); 

        (uint256 price, int8 decimals, ) = IFtsoV2(FTSO_V2_ADDRESS).getFeedById(FLR_USD_ID);
        require(price > 0, "Oracle price unavailable");

        uint256 loanLimitUSD = (profiles[_user].lifetimeEarnings * 10) / 100;
        uint256 precisionFactor = 10 ** (18 - uint8(decimals));
        uint256 calculatedLoanFLR = (loanLimitUSD * precisionFactor) / price;
        uint256 finalLoan = calculatedLoanFLR > MAX_LOAN_CAP ? MAX_LOAN_CAP : calculatedLoanFLR;
        
        require(address(this).balance >= finalLoan, "Liquidity Low");

        profiles[_user].hasActiveLoan = true;
        profiles[_user].loanAmount = finalLoan;
        totalLiquidity -= finalLoan;
        
        payable(_user).transfer(finalLoan);
        emit LoanTaken(_user, finalLoan);
    }

    // --- 7. REPAY ---
    function repay() external payable {
        address user = msg.sender;
        require(profiles[user].hasActiveLoan, "No loan");

        uint256 principal = profiles[user].loanAmount;
        uint256 interest = (principal * INTEREST_RATE) / 100;
        uint256 totalDue = principal + interest;

        require(msg.value >= totalDue, "Include 5% interest");

        profiles[user].hasActiveLoan = false;
        profiles[user].loanAmount = 0;

        totalLiquidity += msg.value; 

        emit LoanRepaid(user, principal, interest);
    }

    // --- 8. GASLESS SYNC ---
    function syncPlatformDataGasless(
        address _user,
        uint256 _earnings, 
        uint256 _score, 
        uint256 _tenure, 
        bytes memory _signature
    ) external onlyAdmin {
        require(isBorrower[_user], "Not a borrower");

        bytes32 messageHash = keccak256(abi.encodePacked(_user, _earnings, _score, _tenure));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        
        address signer = recoverSigner(ethSignedMessageHash, _signature);
        require(signer == platformSigner, "Invalid Signature");

        profiles[_user].lifetimeEarnings = _earnings;
        profiles[_user].reviewScore = _score;
        profiles[_user].tenureMonths = _tenure;
        profiles[_user].isDataVerified = true;

        emit DataSynced(_user, _earnings, _score);
    }

    // --- 9. SYNC (Standard) ---
    function syncPlatformData(uint256 _earnings, uint256 _score, uint256 _tenure, bytes memory _signature) external {
        require(isBorrower[msg.sender], "Not a borrower");
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _earnings, _score, _tenure));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedMessageHash, _signature);
        require(signer == platformSigner, "Invalid Signature");
        profiles[msg.sender].lifetimeEarnings = _earnings;
        profiles[msg.sender].reviewScore = _score;
        profiles[msg.sender].tenureMonths = _tenure;
        profiles[msg.sender].isDataVerified = true;
        emit DataSynced(msg.sender, _earnings, _score);
    }

    // --- 10. VIEW FUNCTION ---
    function getCreditDetails(address _user) external view returns (uint256 flrPriceUSD, uint256 rawEligibility, uint256 finalCappedLoan) {
        (uint256 price, int8 decimals, ) = IFtsoV2(FTSO_V2_ADDRESS).getFeedById(FLR_USD_ID);
        
        uint256 earnings = profiles[_user].lifetimeEarnings;
        uint256 loanLimitUSD = (earnings * 10) / 100; 
        
        uint256 precisionFactor = 10 ** (18 - uint8(decimals));
        uint256 calculatedLoanFLR = (loanLimitUSD * precisionFactor) / price;

        return (price, calculatedLoanFLR, MAX_LOAN_CAP);
    }

    function recoverSigner(bytes32 _h, bytes memory _s) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_s);
        return ecrecover(_h, v, r, s);
    }
    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Bad sig");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
    receive() external payable {}
}