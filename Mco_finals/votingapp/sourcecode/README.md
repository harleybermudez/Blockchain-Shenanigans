# Voting application 

## Structure

| Path | Purpose |
| --- | --- |
| contracts/CampusVoting.sol | Registration, admin permissions, one vote per wallet, counting, permanent close |
| frontend/html/ | Seven separate application pages plus setup.html |
| frontend/css/common.css | Design, navigation, controls, responsive styles |
| frontend/css/index.css, Signup.css, admin-login.css, candidates.css, vote.css, results.css, admin.css | Styles for the corresponding pages |
| frontend/script/config.js | Contract address, network, and public RPC |
| frontend/script/common.js | Shared plain app object for wallet, data reads, transactions, and confirmation |
| frontend/script/index.js, signup.js, admin-login.js, candidates.js, vote.js, results.js, admin.js | Direct behavior for each page |
| frontend/script/vendor/ | Ethers.js 5.7.2 and its license |
| docs/abi.json | Complete compiler-generated contract ABI |
| docs/deployed-contract-address.txt |  deployment address |
| docs/screenshots/ | Live test evidence |

## Workflow

The deploying wallet is the preassigned admin. Admin login checks it against
Ownable.owner(). Voters sign up with a separate MetaMask wallet and wait for
authorization. There is no separate username/password account.

Admin adds at least two candidates for the same position, approves at least one
voter, and starts voting. Starting locks candidate and voter setup. Each authorized
wallet can vote once for one candidate. Voting requires a review and MetaMask
confirmation; success is displayed only after blockchain confirmation.

Admin may authorize a verified wallet directly, which also registers it. The
contract blocks duplicate votes, unauthorized votes, and all votes after closing.
Closing is permanent. A fresh contract is needed for another election.

Candidates can be viewed without connecting a wallet. The final results table
shows names, vote counts, and total confirmed votes after closing. Percentages,
winner/tie announcements, full account-details panels, fee banners, and detailed
technical error explanations are not included.

Each page loads Ethers.js, config.js, common.js, then its own page script, all using
defer. Shared data refreshes every 5 seconds while visible and idle. Account and
network changes clear the app session. Transaction signing always uses the expected
wallet address explicitly. Logging out clears the app session, not MetaMask's site
permission.


## Group 

| Member:BERMUDEZ
| Member:CALVO
| Member:LASAN
| Member:RICAFRENTE

## References

- Sir OWEN-provided voting contract, JavaScript example, and stack guide.
- https://docs.ethers.org/v5/
- https://docs.openzeppelin.com/contracts/5.x/access-control
- https://remix.ethereum.org

Ethers.js is bundled with its upstream license. OpenZeppelin is imported at compile
time. 
The frontend loads the compiled contract interface from frontend/abi.json.
