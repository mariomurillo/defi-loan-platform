import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("DeFiLoanPlatform", function () {
    let DeFiLoanPlatform, defiLoanPlatform, lender, borrower;

    beforeEach(async function () {
        try {
            // Obtener los signers
            [lender, borrower] = await ethers.getSigners();

            // Obtener la fábrica del contrato
            DeFiLoanPlatform = await ethers.getContractFactory("DeFiLoanPlatform");

            // Desplegar el contrato
            defiLoanPlatform = await DeFiLoanPlatform.deploy();
        } catch (error) {
            console.error("Error durante el despliegue:", error);
        }
    });

    it("Should allow a user to offer a loan", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        await expect(defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral))
            .to.emit(defiLoanPlatform, "LoanOffered")
            .withArgs(1, lender.address, amount, interestRate);

        const loan = await defiLoanPlatform.loans(1);
        expect(loan.lender).to.equal(lender.address);
        expect(loan.amount).to.equal(amount);
        expect(loan.interestRate).to.equal(interestRate);
    });

    it("Should allow a user to take a loan", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Borrower takes the loan
        await expect(defiLoanPlatform.connect(borrower).takeLoan(1, { value: amount }))
            .to.emit(defiLoanPlatform, "LoanTaken")
            .withArgs(1, borrower.address);

        const loan = await defiLoanPlatform.loans(1);
        expect(loan.borrower).to.equal(borrower.address);
    });

    it("Should allow the borrower to complete the loan", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Borrower takes the loan
        await defiLoanPlatform.connect(borrower).takeLoan(1, { value: amount });

        // Borrower completes the loan
        const repaymentAmount = amount + (amount * BigInt(interestRate) / 100n);
        await expect(defiLoanPlatform.connect(borrower).completeLoan(1, { value: repaymentAmount }))
            .to.emit(defiLoanPlatform, "LoanCompleted")
            .withArgs(1);

        const loan = await defiLoanPlatform.loans(1);
        expect(loan.completed).to.be.true;
    });

    it("Should fail if non-lender tries to adjust interest rate", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Another account (borrower) tries to adjust interest rate
        await expect(defiLoanPlatform.connect(borrower).adjustInterestRate(1, 10))
            .to.be.revertedWith("Only the lender can adjust the interest rate");
    });

    it("Should allow the lender to adjust the interest rate", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Lender adjusts interest rate
        await defiLoanPlatform.connect(lender).adjustInterestRate(1, 10);
        const loan = await defiLoanPlatform.loans(1);
        expect(loan.interestRate).to.equal(10);
    });

    it("Should fail if attempting to take a loan after the due date", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Move the blockchain forward to exceed the due date
        await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
        await ethers.provider.send("evm_mine");

        // Borrower attempts to take the loan after the due date
        await expect(defiLoanPlatform.connect(borrower).takeLoan(1, { value: amount }))
            .to.be.revertedWith("The loan has expired");
    });

    it("Should fail if offering a loan without enough collateral", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("4"); // Less than 50% of the loan amount

        // Lender attempts to offer a loan with insufficient collateral
        await expect(defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral))
            .to.be.revertedWith("Collateral must be at least 50% of the loan amount");
    });

    it("Should fail if attempting to complete a loan that has already been completed", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Borrower takes the loan
        await defiLoanPlatform.connect(borrower).takeLoan(1, { value: amount });

        // Borrower completes the loan
        const repaymentAmount = amount + (amount * BigInt(interestRate)) / BigInt(100);
        await defiLoanPlatform.connect(borrower).completeLoan(1, { value: repaymentAmount });

        // Attempt to complete the loan again
        await expect(defiLoanPlatform.connect(borrower).completeLoan(1, { value: repaymentAmount }))
            .to.be.revertedWith("The loan has already been completed");
    });

    it("Should fail if attempting to take a loan without sending enough ETH", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Borrower attempts to take the loan with insufficient funds
        const insufficientAmount = ethers.parseEther("5");
        await expect(defiLoanPlatform.connect(borrower).takeLoan(1, { value: insufficientAmount }))
            .to.be.revertedWith("The amount sent must match the loan amount");
    });

    it("Should fail if attempting to adjust the interest rate of a completed loan", async function () {
        const amount = ethers.parseEther("10");
        const interestRate = 5; // 5%
        const collateral = ethers.parseEther("5");

        // Lender offers a loan
        await defiLoanPlatform.connect(lender).offerLoan(amount, interestRate, collateral);

        // Borrower takes the loan
        await defiLoanPlatform.connect(borrower).takeLoan(1, { value: amount });

        // Borrower completes the loan
        const repaymentAmount = amount + (amount * BigInt(interestRate)) / BigInt(100);
        await defiLoanPlatform.connect(borrower).completeLoan(1, { value: repaymentAmount });

        // Lender attempts to adjust the interest rate after the loan is completed
        await expect(defiLoanPlatform.connect(lender).adjustInterestRate(1, 10))
            .to.be.revertedWith("The loan has already been completed");
    });
});
