const blessed = require('blessed');

const { APP_TITLE } = require('./config');
const { dmUI } = require('./dm-ui');

const MainUI = (configuration, storage, network) => {

  let output;
  let input;
  let e2eMessages = storage.e2eMessages;

  const screen = blessed.screen({
    smartCSR: true,
    dockBorders: true,
    height: '100%',
  });

  screen.title = APP_TITLE;

  // Quit on Escape, q, or Control-C.
  screen.key(['C-c'], (ch, key) => {
    // TODO: gracefully shutdown IPFS node
    return process.exit(0);
  });

  output = blessed.Log({
    name: 'main-output',
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
    name: 'peers-wrapper',
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
    label: ' Command / Broadcast: ',
    parent: screen,
    name: 'main-input',
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

  const DIRECT_MSG = 'dm';
  const PROFILE_MSG = 'profile';
  const BROADCAST_MSG = 'brodcast';

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
      if (msg.indexOf('/') === 0) {
        // badly formed command here
        output.log(`WUT: badly formed command: ${msg}`);
        break;
      }
      let obj = { content: msg, messageType: BROADCAST_MSG };
      network.room.broadcast(JSON.stringify(obj));
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

  const whichCommand = (command) => {
    // output.log(`**** INPUT: ${command}`);
    if (!command.startsWith('/')) {
      return null;
    }

    let firstSpace = command.indexOf(' ');
    let endChar;

    if (firstSpace == -1) {
      endChar = command.length - 1;
    } else {
      endChar = firstSpace;
    }

    let comm = command.substring(0, endChar);

    switch (comm) {
    case '/handle':
      return 'handle';
    case '/peer':
      return 'peer';
    case '/dm':
      return 'dm';
    case '/help':
      return 'help';
    default:
      return null;
    }
  };

  const HELP_COMMANDS = [
    { name: '/help', descrption: 'Displays this help data.' },
    { name: '/handle', descrption: 'Change your handle: "/handle my-new-name"' },
    { name: '/dm', descrption: 'Start a DM "/dm another-handle"' },
  ];

  const help = (data) => {
    HELP_COMMANDS.forEach((cmd) => {
      output.log(`${cmd.name}: ${cmd.descrption}`);
    });
  };

  const handle = (data, output) => {
    data = data.split(" ");
    if (data.length != 2) {
      output.log(`*** ERR: invalid input for /handle: ${data}`);
      input.clearValue();
      return;
    }

    // TODO: Do not allow duplicate handles!
    configuration.handle = data[1].trim();
    // output.log(`*** your /handle is now ${data[1]}`);
    input.clearValue();
    network.broadcastProfile();
  };

  const peerRefresh = () => {
    // get all peer profiles
    for (let idx in configuration.peerProfiles) {
      network.room.sendTo(configuration.peerProfiles[idx].id, 'get-profile');
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

  const dm = (data) => {
    // get the peer
    // use room.sendTo(cid, msg) to communicate
    // use peer CID as chatSession property in order to route DMs to correct dmUI
    // `esc` closes the chat window
    if (configuration.handle === configuration.id) {
      return output.log(`*** Please set your handle with "/handle myhandle"`);
    }
    data = data.split(" ");
    if (data.length != 2) {
      output.log(`*** ERR: invalid input for /dm: ${data}`);
      input.clearValue();
      return;
    }

    const getProfile = (id) => {
      output.log(`getProfile(${id})`);
      output.log(JSON.stringify(configuration.peerProfiles));
      for (let idx in configuration.peerProfiles) {
        output.log(idx);
        if (id == idx) {
          return configuration.peerProfiles[idx];
        }
        if (id == configuration.peerProfiles[idx].handle) {
          return configuration.peerProfiles[idx];
        }
      }
      return null;
    };

    const profile = getProfile(data[1].trim()); // TODO: trim all data submitted via the input!
    if (!profile) {
      return output.log(`*** Error: cannot get profile for ${data[1]}`);
    }
    const ui = dmUI(screen, profile, configuration, network);
    e2eMessages[profile.id] = {ui: ui};
  };

  const commands = {
    handle: handle,
    peer: peer,
    dm: dm,
    help: help,
  };

  return {
    output: output,
    input: input,
    peersWrapper: peersWrapper,
    peersList: peersList,
    screen: screen,
  };

};

module.exports = {
  MainUI: MainUI,
};
