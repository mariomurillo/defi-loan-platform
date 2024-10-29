// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Loan.sol";
import "./Governance.sol";

contract DeFiLoanPlatform is Loan, Governance {
    mapping(address => uint) public collaterals;

    function offerLoan(uint _amount, uint _interestRate, uint _collateral) public {
        require(_amount > 0, "Loan amount must be greater than zero");
        require(_collateral >= _amount / 2, "Collateral must be at least 50% of the loan amount");

        collaterals[msg.sender] += _collateral;
        _createLoan(msg.sender, _amount, _interestRate, _collateral);
    }

    function takeLoan(uint _loanId) public payable {
        LoanDetails storage loan = loans[_loanId];
        require(loan.amount == msg.value, "The amount sent must match the loan amount");
        require(loan.dueDate > block.timestamp, "The loan has expired");

        _markLoanTaken(_loanId, msg.sender);
        collaterals[loan.lender] -= loan.collateral;
    }

    function completeLoan(uint _loanId) public payable {
        LoanDetails storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only the borrower can complete the loan");
        require(!loan.completed, "The loan has already been completed");

        uint amountToRepay = loan.amount + ((loan.amount * loan.interestRate) / 100);
        require(msg.value >= amountToRepay, "Not enough ETH sent to repay the loan");

        _completeLoan(_loanId);
        payable(loan.lender).transfer(amountToRepay);
    }
}
