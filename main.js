/*
  WUT? : a very simple terminal-based chat application runing on top of IPFS, tweetnacl-js & blessed

  Author: David Dahl <ddahl@nulltxt.se>
*/

'use strict';

const IPFS = require('ipfs');
const all = require('it-all');
const blessed = require('blessed');
const Room = require('ipfs-pubsub-room');

let topic = '__wut__chat__';


async function main () {

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

  const output = blessed.Log({
    parent: screen,
    scrollable: true,
    label: 'WUT: IPFS + TweetNacl Chat',
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
    label: 'Peers',
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

  const input = blessed.Textbox({
    label: 'Enter a message:',
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

  output.log('welcome');
  output.log('to');
  output.log('WUT');
  input.focus();

  output.log('IPFS node is initialized!');
  output.log('IPFS Version:', version.version);
  output.log('IPFS Node Id:', nodeId);

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
    output.log(`${message.from}: ${message.data}`);
  });


  let interval = setInterval(() => {
    let peers = room.getPeers();
    peersList.log(`Peers: ${peers}`);
  }, 5000);

}

process.on('uncaughtException', (error) => {
  console.log(error);
});

main();
