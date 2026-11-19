# Validation

Checked on November 16, 2026.

- 50 local contract and frontend checks passed using Solidity 0.8.24, Ganache, Ethers 5.7.2 and JSDOM.
- Contract checks cover admin permissions, candidate validation, voter registration and approval, setup locks, one vote per approved wallet, vote totals and permanent closing.
- Frontend checks cover separate page scripts, paths, wallet sessions, account/network changes, confirmation cancellation, failed signing, native template rendering, and results hidden until closing.
- Candidate names are rendered as text; an HTML-like name was checked without execution.
- The setup guide keeps its CSS inline. Application pages have separate CSS and scripts.
- Browser inspection confirmed the desktop registration layout and its 360-pixel mobile layout. Mobile content width equals viewport width, with no horizontal overflow.
- This is local workflow validation, not a production security audit. No public-testnet contract was deployed or real wallet transaction signed during these checks.

Deploy a fresh contract in Remix and update frontend/script/config.js before testing with MetaMask on Sepolia. Follow frontend/html/setup.html for the manual three-account test.
