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
const  {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64
} = require('tweetnacl-util');

const topic = '__wut__chat__';

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
    dockBorders: true
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
    height: 20,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'green',
      bg: 'black',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  const peersList = blessed.Log({
    parent: screen,
    scrollable: true,
    label: ' Peers ',
    top: 0,
    left: '60%',
    width: '40%',
    height: 20,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'green',
      bg: 'black',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  input = blessed.Textbox({
    label: ' Enter a message: ',
    parent: screen,
    top: 20,
    left: 0,
    width: '100%',
    height: '10%',
    tags: true,
    border: {
      type: 'line'
    },
    scrollbar: false,
    style: {
      fg: 'green',
      bg: 'black',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  input.on('keypress', (value, key) => {

    const RETURN = 'return';
    const BACKSPACE = 'backspace';
    const SCROLL_UP = '\u001bOA';
    const SCROLL_DOWN = '\u001bOB';
    const UP = 'up';
    const DOWN = 'down';

    // TODO: handle control-a, -x, etc

    // output.log(key);
    switch (key.name) {
    case RETURN:
      let msg = input.getValue();

      let comm = whichCommand(msg);

      if (comm) {
        commands[comm](msg, output);
        return;
      }

      room.broadcast(msg);
      // output.log(msg);
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

  output.log('................Welcome');
  output.log('...................To');
  output.log('..................WUT\n');
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
  });

  room.on('peer left', (peer) => {
    output.log(`Peer left: ${peer}`);
  });

  room.on('message', (message) => {
    try {
      let msg = JSON.parse(message.data);
      if (msg.messageType) {
        if (msg.messageType == 'profile') {
          return output.log(`*** Profile broadcast: ${message.from} is now ${msg.handle}`);
        }
      }
    } catch (ex) {}
    return output.log(`${message.from}: ${message.data}`);
  });

  const broadcastProfile = () => {
    let profile = JSON.stringify({
      messageType: 'profile',
      handle: configuration.handle,
      publicKey: configuration.keyPair.publicKey,
      bio: configuration.bio,
      id: nodeId.id,
    });
    room.broadcast(profile);
  };


  let peers = room.getPeers();
  configuration.peers = peers;
  peersList.log(`Peers: ${peers}`);

  let interval = setInterval(() => {
    let peers = room.getPeers();
    configuration.peers = peers;
    peersList.setContent('');
    peersList.log(`Peers: ${peers}`);
  }, 5000);

}

function invitePeerToPrivateRoom(peerId) {
  // Invite a peer to a private, encrypted chat

}

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
    break;
  case '/peer':
    return 'peer';
    break;
  default:
    return null;
  }
};

const handle = (data, output) => {
  data = data.split(" ");
  if (data.length != 2) {
    output.log(`*** ERR: invalid input for /handle: ${input}`);
    input.clearValue();
    return;
  }

  configuration.handle = data[1];
  output.log(`*** your /handle is now ${data[1]}`);
  input.clearValue();
};

const peer = (data, output) => {
  // peer commands

};

const commands = {
  handle: handle,
  peer: peer,
};



process.on('uncaughtException', (error) => {
  console.log(error);
});

main();
