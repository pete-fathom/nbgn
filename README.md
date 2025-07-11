# NBGN Stablecoin

A production-ready New Bulgarian Lev (NBGN) stablecoin implementation with Euro peg using EURC collateral.

## Overview

NBGN is an ERC-20 stablecoin that maintains a fixed exchange rate with the Euro (1 EUR = 1.95583 NBGN), backed by Circle's EURC stablecoin. The contract implements:

- **Fixed conversion rate**: 1 EUR = 1.95583 NBGN (official Bulgarian Lev rate)
- **EURC collateral**: Backed 1:1 by Circle's Euro Coin (EURC)
- **Upgradeable**: UUPS proxy pattern for future improvements
- **Security features**: Pausable, reentrancy guards, access controls
- **Emergency functions**: Owner can pause/unpause and perform emergency withdrawals

## Quick Start

### Prerequisites

- Node.js >= 18.0
- npm >= 7.0
- Git

### Installation

```bash
git clone <repository>
cd nbgn-stablecoin
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:
- Add your private key (NEVER commit this)
- Add Infura/Alchemy RPC URLs
- Add Etherscan API key

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
npx hardhat test --grep "specific test name"
```

### Deploy to Testnet (Sepolia)

```bash
npx hardhat run scripts/deploy-testnet.js --network sepolia
```

### Deploy to Mainnet

```bash
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

### Verify Contracts

After deployment, update the addresses in your `.env` file and run:

```bash
npx hardhat run scripts/verify-contracts.js --network <network>
```

## Contract Architecture

### Main Contract: NBGN.sol

- **Upgradeable ERC-20**: Using OpenZeppelin's upgradeable contracts
- **UUPS Pattern**: Allows for contract upgrades with proper authorization
- **Collateral Management**: Tracks EURC deposits and ensures backing
- **Conversion Functions**: Calculate NBGN/EURC amounts with fixed rate

### Key Functions

- `mint(uint256 _eurcAmount)`: Deposit EURC and receive NBGN
- `redeem(uint256 _nbgnAmount)`: Burn NBGN and receive EURC
- `calculateNBGN(uint256 _eurcAmount)`: Calculate NBGN amount for given EURC
- `calculateEURC(uint256 _nbgnAmount)`: Calculate EURC amount for given NBGN
- `pause()/unpause()`: Emergency pause functionality (owner only)
- `emergencyWithdraw()`: Recover tokens in emergency (owner only)

## Security Considerations

1. **Audit Required**: Get a professional audit before mainnet deployment
2. **Access Control**: Transfer ownership to a multisig wallet
3. **Monitoring**: Set up alerts for unusual activity
4. **Upgrades**: Use timelocks for upgrade operations
5. **Private Keys**: Use hardware wallets for mainnet

## Gas Costs (Estimates)

- Contract deployment: ~0.036 ETH at 30 gwei
- Minting NBGN: ~100,000 gas
- Redeeming NBGN: ~80,000 gas

## Development Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Check contract sizes
npx hardhat size-contracts

# Run local node
npx hardhat node

# Deploy to local node
npx hardhat run scripts/deploy-testnet.js --network localhost
```

## Deployment Checklist

### Pre-deployment
- [ ] Complete security audit
- [ ] Test on Sepolia testnet
- [ ] Verify gas optimization
- [ ] Review access controls
- [ ] Prepare multisig wallet

### Post-deployment
- [ ] Verify contracts on Etherscan
- [ ] Transfer ownership to multisig
- [ ] Set up monitoring
- [ ] Document deployment addresses
- [ ] Test all functions on mainnet

## Support

For issues and questions:
- Open an issue in the repository
- Contact the development team

## License

MIT License - see LICENSE file for details

## Disclaimer

This is a financial smart contract dealing with real value. Always conduct thorough testing and professional audits before mainnet deployment. The developers are not responsible for any losses incurred through the use of this software.# nbgn
