async function main() {
    const DeFiLoanPlatform = await ethers.getContractFactory("DeFiLoanPlatform");
    const defiLoanPlatform = await DeFiLoanPlatform.deploy();

    await defiLoanPlatform.deployed();

    console.log("DeFiLoanPlatform deployed to:", defiLoanPlatform.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
