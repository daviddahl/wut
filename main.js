/*
  WUT? : a very simple terminal-based chat application runing on top of IPFS, tweetnacl-js & blessed

  Author: David Dahl <ddahl@nulltxt.se>
*/

'use strict';

const IPFS = require('ipfs');
const all = require('it-all');
const blessed = require('blessed');
const Room = require('ipfs-pubsub-room');
const { v4: uuidv4 } = require('uuid');

const { box, secretbox, randomBytes } = require('tweetnacl');
const {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64
} = require('tweetnacl-util');

const { e2eUI } = require('./lib/ui.js');

const topic = '__wut__chat__';

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

const configuration = {
  handle: null,
  bio: 'Web 3.0 Enthusiast',
  homepage: 'https://github.com/daviddahl/wut',
  myTopic: uuidv4(),
  sharedKey: null,
  keyPair: null,
  peerProfiles: {},
};

let output,
    input;

async function main () {

  configuration.keyPair = box.keyPair();

  const node = await IPFS.create();
  const version = await node.version();
  const nodeId = await node.id();
  const room = new Room(node, topic);

  const screen = blessed.screen({
    smartCSR: true,
    dockBorders: true,
    height: 20,
  });

  const title = 'WUT?';

  screen.title = title;

  // Quit on Escape, q, or Control-C.
  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    // TODO: gracefully shutdown IPFS node
    return process.exit(0);
  });

  output = blessed.Log({
    parent: screen,
    scrollable: true,
    label: ' WUT: IPFS + TweetNacl Chat ',
    top: 0,
    left: 0,
    width: '60%',
    height: '90%',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'blue',
      bg: null,
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  const peersWrapper = blessed.Box({
    label: ' Peers ',
    border: {
      type: 'line'
    },
    parent: screen,
    top: 0,
    left: '60%',
    width: '40%',
    height: '90%',
    style: {
      fg: 'blue',
      bg: null,
      border: {
        fg: '#f0f0f0'
      },
      focus: {
        border: {
          fg: 'blue',
        }
      }
    }
  });

  const peersList = blessed.Table({
    parent: peersWrapper,
    scrollable: true,
    top: 0,
    left: 0,
    width: '98%',
    height: '100%',
    tags: true,
  });

  peersWrapper.on('keypress', (value, key) => {

    const TAB = 'tab';
    const RETURN = 'return';
    const BACKSPACE = 'backspace';
    const SCROLL_UP = '\u001bOA';
    const SCROLL_DOWN = '\u001bOB';
    const UP = 'up';
    const DOWN = 'down';

    // TODO: handle arrows up / down, return

    // output.log(key);
    switch (key.name) {
    case TAB:
      input.focus();
      return;
    default:
      break;
    }
  });

  input = blessed.Textbox({
    label: ' Enter a message: ',
    parent: screen,
    top: '90%',
    left: 0,
    width: '99.9%',
    height: 4,
    tags: true,
    border: {
      type: 'line'
    },
    scrollbar: false,
    style: {
      fg: 'blue',
      bg: null,
      border: {
        fg: '#f0f0f0',
        bg: null,
      },
      focus: {
        border: {
          fg: 'blue',
          bg: null,
        }
      },
    }
  });

  input.on('keypress', (value, key) => {

    const TAB = 'tab';
    const RETURN = 'return';
    const BACKSPACE = 'backspace';
    const SCROLL_UP = '\u001bOA';
    const SCROLL_DOWN = '\u001bOB';
    const UP = 'up';
    const DOWN = 'down';

    // TODO: handle control-a, -x, etc

    switch (key.name) {
    case TAB:
      peersWrapper.focus();
      return;
    case RETURN:
      let msg = input.getValue();
      let comm = whichCommand(msg);
      if (comm) {
        commands[comm](msg, output);
        return;
      }

      room.broadcast(msg);
      screen.render();
      input.clearValue();
      break;
    case BACKSPACE:
      let val = input.getValue();
      if (val.length) {
        input.setValue(val.substring(0, (val.length -1)));
      }
      break;
    case UP:
    case DOWN:
      if ([SCROLL_UP, SCROLL_DOWN].includes(key.sequence)) {
        break;
      }
    default:
      input.setValue(`${input.value}${value}`);
      break;
    }

    screen.render();
  });

  screen.append(input);
  screen.append(output);
  screen.render();

  output.log('................... Welcome ...............');

  output.log('................... To ....................');

  output.log('................... WUT ...................\n');

  output.log('\n\n  *** This is the LOBBY. It is *plaintext* group chat ***  \n\n');

  // TODO: Display public key as QR CODE
  output.log(`Your NaCl public key is: ${configuration.keyPair.publicKey}\n`);
  input.focus();

  output.log('IPFS node is initialized!');
  output.log('IPFS Version:', version.version);
  output.log('IPFS Node Id:', nodeId.id);

  room.on('subscribed', () => {
    output.log(`Now connected to room: ${topic}`);
  });

  room.on('peer joined', (peer) => {
    output.log(`Peer joined the room: ${peer}`);
    if (peer == nodeId.id) {
      if (!configuration.handle) {
        // set default for now
        configuration.handle = nodeId.id;
      }
      // Its YOU!
      broadcastProfile();
    }
  });

  room.on('peer left', (peer) => {
    output.log(`Peer left: ${peer}`);
  });

  const DIRECT_MSG = 'dm';
  const PROFILE_MSG = 'profile';

  room.on('message', (message) => {
    try {
      let msg = JSON.parse(message.data);
      if (msg.messageType) {
        if (msg.messageType == PROFILE_MSG) {
          // update peerprofile:
          configuration.peerProfiles[message.from] = {
            id: message.from,
            handle: msg.handle,
            bio: msg.bio,
            publicKey: msg.publicKey,
          };
          return output.log(`*** Profile broadcast: ${message.from} is now ${msg.handle}`);
        } else if (msg.messageType == DIRECT_MSG) {
          handleDirectMessage(message.from, msg);
        }
      }
    } catch (ex) {}

    // Handle peer refresh request
    if (message.data == 'peer-refresh') {
      broadcastProfile(message.from);
    }

    return output.log(`${message.from}: ${message.data}`);
  });

  const handleDirectMessage = (fromCID, msg) => {
    // Check for existing e2eUI
    let ui;

    try {
      ui = e2eMessages[fromCID].ui;
    } catch(ex) {
      // establish the UI, accept first message
      // TODO: whitelisting of publicKeys
      ui = e2eUI(screen, fromCID);
      e2eMessages[fromCID] = {ui: ui};
    }

    // Make sure we have the from PublicKey!
    let  pubKey;

    try {
      pubKey = configuration['peerProfiles']['publicKey'];
    } catch (ex) {
      // We do not have the publickey for this peer!?
      ui.log(`Cannot decrypt messages from ${msg.handle}`);
      return;
    }

    // Decrypt `msg.content` with pubKey, msg.nonce
    try {
      const plaintext = box.open(
        msg.content,
        msg.nonce,
        pubKey,
        configuration.keyPair.privateKey
      );
      ui.log(`${msg.handle}: ${plaintext}`);
    } catch (ex) {
      ui.log(`***`);
      ui.log(`Cannot decrypt messages from ${msg.handle}`);
      ui.log(`${ex}`);
      ui.log(`***`);
      return;
    }
  };

  const createDirectMessage = (profile, msg) => {
    // check if we have a UI for the DM or create one

    // a DM will look like:
    // {
    //   handle: <handle>,
    //   toCID: <cid>,
    //   fromCID: <cid>,
    //   fromHandle: <handle>,
    //   nonce: <nonce>,
    //   content: <encrypted data>,
    //   authorPubKey: <pubKey>,
    // }

  };

  const broadcastProfile = (cid) => {
    let profile = JSON.stringify({
      messageType: 'profile',
      handle: configuration.handle,
      publicKey: configuration.keyPair.publicKey,
      bio: configuration.bio,
      id: nodeId.id,
    });

    if (cid) {
      room.sendTo(cid, profile);
    } else {
      room.broadcast(profile);
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
  }, 7000);

  // TODO: add /help function

  // TODO: add /peer find <name> / <cid>

  const whichCommand = (input) => {
    // output.log(`**** INPUT: ${input}`);
    if (!input.startsWith('/')) {
      return null;
    }

    let firstSpace = input.indexOf(' ');
    if (firstSpace == -1) {
      return null;
    }

    let comm = input.substring(0, firstSpace);
    // output.log(`comm: ${comm}`);
    switch (comm) {
    case '/handle':
      return 'handle';
    case '/peer':
      return 'peer';
    case '/e2e':
      return 'e2e';
    default:
      return null;
    }
  };

  const handle = (data, output) => {
    data = data.split(" ");
    if (data.length != 2) {
      output.log(`*** ERR: invalid input for /handle: ${data}`);
      input.clearValue();
      return;
    }

    // TODO: Do not allow duplicate handles!
    configuration.handle = data[1];
    // output.log(`*** your /handle is now ${data[1]}`);
    input.clearValue();
    broadcastProfile();
  };

  const peerRefresh = () => {
    // get all peer profiles
    for (let idx in configuration.peerProfiles) {
      room.sendTo(configuration.peerProfiles[idx].id, 'get-profile');
    }
  };

  const peer = (data) => {
    // peer commands
    data = data.split(" ");
    if (data.length != 2) {
      output.log(`*** ERR: invalid input for /peer: ${data}`);
      input.clearValue();
      return;
    }

    switch (data[1]) {
    case 'refresh':
      peerRefresh();
      break;
    default:
      break;
    }

    input.clearValue();
  };

  const e2e = (data) => {
    // get the peer
    // use room.sendTo(cid, msg) to communicate
    // use peer CID as chatSession property in order to route DMs to correct e2eUI
    // `q` closes the chat window
    data = data.split(" ");
    if (data.length != 2) {
      output.log(`*** ERR: invalid input for /e2e: ${data}`);
      input.clearValue();
      return;
    }

    const getProfile = (id) => {
      let profile;
      for (let idx in configuration.peerProfiles) {
        if (idx == id) {
          return configuration.peerProfiles[idx];
        }
        if (idx == configuration.peerProfiles[idx].handle) {
          return configuration.peerProfiles[idx];
        }
        return null;
      }
    };

    const profile = getProfile(data[1]);
    if (!profile) {
      return output.log(`*** Error; cannot get profile for ${data[1]}`);
    }
    const ui = e2eUI(screen);
    e2eMessages[profile.cid] = {ui: ui};
    // TODO: make sure ui has reference to input and output


  };

  const commands = {
    handle: handle,
    peer: peer,
    e2e: e2e,
  };

}

process.on('uncaughtException', (error) => {
  console.log(error);
});

main();