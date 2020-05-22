# ¿wut?

Serverless, IPFS, Tweetnacl-js-based chat application for terminal in an `ncurses` style

![](img/wut-screen.png)

## Goals

* [x] Serverless 'lobby' chat multiple participants
* [x] Serverless E2E encrypted chat for 2 participants (at first)
* [x] As nerdy as possbile, hence the `ncurses` style
* [ ] Tab-completion of peer names, commands
* [ ] Tests
* [ ] DMs List UI
* [ ] Paste screenshots into chat
* [ ] Keys / keychain persistence
* [ ] Key stretching / BIP-39 password for keychain, configuration data.
* [ ] Keybase-style UI layout
* [ ] Encrypted file sharing via tweetnacl-js & IPFS file storage
* [ ] SES-based plugins, (See: Secure ECMAScript)
* [ ] Group encrypted chat
* [ ] Emojis
* [ ] Encrypted message persistence in IPFS / OrbitDB, etc

## Install

Requirements: node 12+

`git clone git@github.com:daviddahl/wut.git`

`cd wut`

`npm install`

`node main.js`
