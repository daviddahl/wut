/*
  ¿wut? : a very simple terminal-based chat application runing on top of IPFS, tweetnacl-js & blessed

  Author: David Dahl <ddahl@nulltxt.se>
*/

'use strict';
const PeerInfo = require('peer-info')
const IPFS = require('ipfs');
const Room = require('ipfs-pubsub-room');
const wrtc = require('wrtc');
const WStar = require('libp2p-webrtc-star');
const TCP = require('libp2p-tcp');

const all = require('it-all');
const { v4: uuidv4 } = require('uuid');
const { box } = require('tweetnacl');

const { convertObjectToUint8 } = require('../lib/keys');
const { Network } = require('../lib/network');
const { logger } = require('../lib/logger');
const {
  DEFAULT_TOPIC,
  APP_TITLE,
  PEER_REFRESH_MS,
  HOME_DIR,
} = require('../lib/config');

const {
  libp2pBundle,
  signalServerIP,
  signalServerPort,
  signalServerCID,
  ssAddr,
} = require('./p2p');

var configuration = {
  handle: null,
  bio: 'Web 3.0 Enthusiast',
  homepage: 'https://github.com/daviddahl/wut',
  myTopic: uuidv4(),
  sharedKey: null,
  keyPair: null,
  peerProfiles: {},
};

const e2eMessages = {};

const storage = {
  e2eMessages: e2eMessages,
  configuration: configuration,
  topic: DEFAULT_TOPIC,
};

async function main () {

  let ipfsRepoPath = `${HOME_DIR}/`;
  // create and expose main UI
  let _keyPair = box.keyPair();
  let pk = convertObjectToUint8(_keyPair.publicKey);
  let sk = convertObjectToUint8(_keyPair.secretKey);

  configuration.keyPair = { publicKey: pk, secretKey: sk };

  const p2p = await libp2pBundle()
  const nodeId = p2p.peerInfo.id._idB58String

  await p2p.start()

  const addrs = [
    '/ip4/0.0.0.0/tcp/0',
    '/ip4/0.0.0.0/tcp/0/ws',
    '/ip4/0.0.0.0/tcp/9090/ws',
    '/ip4/127.0.0.1/tcp/0/ws',
    '/ip4/127.0.0.1/tcp/0'
  ]

  addrs.forEach((addr) => {
    p2p.peerInfo.multiaddrs.add(addr)
  })

  const room = new Room(p2p, DEFAULT_TOPIC);
  const network = new Network(configuration, nodeId, room)

  // TODO: Display public key as QR CODE
  console.log(`Your NaCl public key is: \n    ${configuration.keyPair.publicKey}\n`);

  console.log(p2p.peerInfo.multiaddrs)
  p2p.peerInfo.multiaddrs.forEach(ma => console.log(ma.toString()))

  console.log('P2P node is initialized!');
  console.log('P2P Node Id:', nodeId);

  configuration.handle = nodeId;

  console.log('\n...........................................');
  console.log('................... Welcome ...............');
  console.log('................... To ....................');
  console.log(`.................. ${APP_TITLE} ..................`);
  console.log('...........................................\n');
  console.log('\n\n*** This is the LOBBY. It is *plaintext* group chat ***');
  console.log('\n*** Type "/help" for help ***\n');

  console.log(`\nP2P signal server: ${signalServerIP()}`);

  p2p.on('peer:connect', (peer) => {
    console.log('Connection established to:', peer.id.toB58String())	// Emitted when a peer has been found
  })

  // Emitted when a peer has been found
  p2p.on('peer:discovery', (peer) => {
    console.log('Discovered:', peer.id.toB58String())
  })

  room.on('subscribed', () => {
    console.log(`Now connected to room: ${DEFAULT_TOPIC}`);
  });

  room.on('peer joined', (peer) => {
    console.log(`Peer joined the room: ${peer}`);
    if (peer == nodeId) {
      if (!configuration.handle) {
        // set default for now
        configuration.handle = peer;
      }
      // Its YOU!
      room.broadcastProfile();
    }
  });

  room.on('peer left', (peer) => {
    console.log(`Peer left: ${peer}`);
  });

  const DIRECT_MSG = 'dm';
  const PROFILE_MSG = 'profile';
  const BROADCAST_MSG = 'brodcast';

  room.on('message', (message) => {
    let msg;

    try {
      msg = JSON.parse(message.data);
    } catch (ex) {
      return console.log(`Error: Cannot parse badly-formed command.`);
    }

    if (msg.messageType) {
      if (msg.messageType == PROFILE_MSG) {
        // update peerprofile:
        configuration.peerProfiles[message.from] = {
          id: message.from,
          handle: msg.handle.trim(),
          bio: msg.bio,
          publicKey: convertObjectToUint8(msg.publicKey),
        };
        return console.log(`*** Profile broadcast: ${message.from} is now ${msg.handle}`);
      } else if (msg.messageType == DIRECT_MSG) {
        console.log('Direct Message? wut?');
        console.log(message.from, msg);
      } else if (msg.messageType == BROADCAST_MSG) {
        return console.log(`*** Broadcast: ${message.from}: ${msg.content}`);
      }
    }

    // Handle peer refresh request
    if (message.data == 'peer-refresh') {
      network.broadcastProfile(message.from);
    }

    return console.log(`${message.from}: ${message.data}`);
  });

  let peers = room.getPeers();
  configuration.peers = [peers];
  if (peers.length) {
    console.log('Peers:', configuration.peers)
  }

  let interval = setInterval(() => {
    let peers = room.getPeers();
    configuration.peers = [peers];
    if (peers.length) {
      console.log('Peers: ', configuration.peers);
    }
  }, PEER_REFRESH_MS);

}

// process.on('uncaughtException', (error) => {
//   logger.error(error);
// });

main();
