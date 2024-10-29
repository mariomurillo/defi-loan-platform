// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Loan {
    struct LoanDetails {
        address lender;
        address borrower;
        uint amount;
        uint interestRate;
        uint dueDate;
        uint collateral;
        bool completed;
    }

    mapping(uint => LoanDetails) public loans;
    uint public loanId;

    event LoanOffered(uint loanId, address lender, uint amount, uint interestRate);
    event LoanTaken(uint loanId, address borrower);
    event LoanCompleted(uint loanId);

    function _createLoan(
        address _lender,
        uint _amount,
        uint _interestRate,
        uint _collateral
    ) internal returns (uint) {
        loanId++;
        loans[loanId] = LoanDetails(_lender, address(0), _amount, _interestRate, block.timestamp + 30 days, _collateral, false);
        emit LoanOffered(loanId, _lender, _amount, _interestRate);
        return loanId;
    }

    function _markLoanTaken(uint _loanId, address _borrower) internal {
        LoanDetails storage loan = loans[_loanId];
        require(loan.borrower == address(0), "The loan has already been taken");
        loan.borrower = _borrower;
        emit LoanTaken(_loanId, _borrower);
    }

    function _completeLoan(uint _loanId) internal {
        LoanDetails storage loan = loans[_loanId];
        loan.completed = true;
        emit LoanCompleted(_loanId);
    }
}
