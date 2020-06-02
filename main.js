/*
  ¿wut? : a very simple terminal-based chat application runing on top of IPFS, tweetnacl-js & blessed

  Author: David Dahl <ddahl@nulltxt.se>
*/

'use strict';
const GossipSub = require('libp2p-gossipsub')
const PeerInfo = require('peer-info')
const IPFS = require('ipfs');
const Room = require('ipfs-pubsub-room');

const wrtc = require('wrtc'); // or require('electron-webrtc')()
const WStar = require('libp2p-webrtc-star');
const TCP = require('libp2p-tcp');

const all = require('it-all');

const { v4: uuidv4 } = require('uuid');

const { box } = require('tweetnacl');
const notifier = require('node-notifier')
const { dmUI } = require('./lib/dm-ui');
const { MainUI } = require('./lib/main-ui');
const { Network } = require('./lib/network');
const { openDirectMessage } = require('./lib/messages');
const { convertObjectToUint8 } = require('./lib/keys');
const { logger } = require('./lib/logger');
const {
  DEFAULT_TOPIC,
  APP_TITLE,
  PEER_REFRESH_MS,
  HOME_DIR,
} = require('./lib/config');

const {
  libp2pBundle,
  signalServerIP,
  signalServerPort,
  signalServerCID,
  ssAddr
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

const uiConfiguration = {
  style: {
    fg: 'blue',
    bg: null,
    border: {
      fg: '#f0f0f0'
    }
  }
};

const storage = {
  e2eMessages: e2eMessages,
  uiConfiguration: uiConfiguration,
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

  const bootstrapSignalingServerMultiAddr =
        `/ip4/${signalServerIP()}/tcp/15555/ws/p2p-webrtc-star/p2p/${p2p.peerInfo.id.toB58String()}`


  const addrs = [
    '/ip4/0.0.0.0/tcp/0',
    '/ip4/0.0.0.0/tcp/0/ws',
    '/ip4/0.0.0.0/tcp/9090/ws',
    '/ip4/127.0.0.1/tcp/0/ws',
    '/ip4/127.0.0.1/tcp/0',
    bootstrapSignalingServerMultiAddr,
  ]

  addrs.forEach((addr) => {
    p2p.peerInfo.multiaddrs.add(addr)
  })

  const room = new Room(p2p, DEFAULT_TOPIC);

  const network = new Network(configuration, nodeId, room);

  const mainUI = MainUI(configuration, storage, network);

  const output = mainUI.output;
  const input = mainUI.input;
  const peersList = mainUI.peersList;
  const screen = mainUI.screen;

  // TODO: Display public key as QR CODE
  output.log(`Your NaCl public key is: \n    ${configuration.keyPair.publicKey}\n`);

  output.log(p2p.peerInfo.multiaddrs)
  p2p.peerInfo.multiaddrs.forEach(ma => output.log(ma.toString()))

  input.focus();

  output.log('P2P node is initialized!');
  output.log('P2P Node Id:', nodeId);

  configuration.handle = nodeId;

  output.log('\n...........................................');
  output.log('................... Welcome ...............');
  output.log('................... To ....................');
  output.log(`.................. ${APP_TITLE} ..................`);
  output.log('...........................................\n');
  output.log('\n\n*** This is the LOBBY. It is *plaintext* group chat ***');
  output.log('\n*** Type "/help" for help ***\n');

  output.log(`\nP2P signal server: ${signalServerIP()}`);

  p2p.on('peer:connect', (peer) => {
    output.log('Connection established to:', peer.id.toB58String())	// Emitted when a peer has been found
  })

  // Emitted when a peer has been found
  p2p.on('peer:discovery', (peer) => {
    output.log('Discovered:', peer.id.toB58String())
  })

  room.on('subscribed', () => {
    output.log(`Now connected to room: ${DEFAULT_TOPIC}`);
  });

  room.on('peer joined', (peer) => {
    output.log(`Peer joined the room: ${peer}`);
    if (peer == nodeId) {
      if (!configuration.handle) {
        // set default for now
        configuration.handle = nodeId;
      }
      // Its YOU!
      network.broadcastProfile();
    }
  });

  room.on('peer left', (peer) => {
    output.log(`Peer left: ${peer}`);
  });

  const DIRECT_MSG = 'dm';
  const PROFILE_MSG = 'profile';
  const BROADCAST_MSG = 'brodcast';

  room.on('message', (message) => {
    let msg;

    let from = message.from.substring(0, 9)

    try {
      msg = JSON.parse(message.data)
    } catch (ex) {
      return output.log(`Error: Cannot parse badly-formed command.`);
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
        return output.log(`*** Profile: ${from} is now ${msg.handle}`);
      } else if (msg.messageType == DIRECT_MSG) {
        return handleDirectMessage(message.from, msg);
      } else if (msg.messageType == BROADCAST_MSG && message.from !== nodeId) {
        notifier.notify({
          title: APP_TITLE,
          message: `${from}: ${msg.content}` // TODO: replace Qm CID with handle if it exists
        });
        return output.log(`${from}: ${msg.content}`);
      }
    }

    // Handle peer refresh request
    if (message.data == 'peer-refresh') {
      network.broadcastProfile(message.from);
    }

    if (message.from === nodeId) {
      return output.log(`Me: ${msg.content}`);
    }
    return output.log(`${from}: ${msg.content}`);
  });

  const handleDirectMessage = (fromCID, msg) => {
    let ui;

    // Check for existing dmUI
    try {
      ui = e2eMessages[fromCID].ui;
    } catch (ex) {
      // establish the UI, accept first message
      // TODO: whitelisting of publicKeys
      let profile = configuration.peerProfiles[fromCID];
      ui = dmUI(screen, profile, storage, network);

      e2eMessages[fromCID] = {ui: ui};
    }

    try {
      let plaintext = openDirectMessage(msg, configuration);
      if (plaintext == null) {
        ui.output.log(`*** ${APP_TITLE}: Error: Message is null.`);
      } else {
        ui.output.log(`${msg.fromHandle}: ${plaintext}`);
      }
    } catch (ex) {
      ui.output.log(`***`);
      ui.output.log(`*** ${APP_TITLE}: Cannot decrypt messages from ${msg.handle}`);
      logger.error(`${ex} ... \n ${ex.stack}`);
      ui.output.log(`***`);
      return;
    }
  };

  let peers = room.getPeers();
  configuration.peers = [peers];
  if (peers.length) {
    peersList.setData(configuration.peers);
    screen.render();
  }

  let interval = setInterval(() => {
    let peers = room.getPeers();
    configuration.peers = [peers];
    if (peers.length) {
      peersList.setData(configuration.peers);
      screen.render();
    }
  }, PEER_REFRESH_MS);

}

// process.on('uncaughtException', (error) => {
//   logger.error(error);
// });

main();
