const blessed = require('blessed');

const { logger } = require('./logger');

const { openDirectMessage, createDirectMessage } = require('./messages');

const dmUI = (parent, profile, storage, network) => {
  // Note: parent === screen in mainUI obj
  if (!parent && !profile && !storage && !network) {
    throw new Error('Parent node, profile, config and network required');
  }

  const wrapper = blessed.Box({
    label: ' ...DM... ',
    border: {
      type: 'line'
    },
    name: profile.id,
    parent: parent,
    top: '25%',
    left: '25%',
    width: '50%',
    height: '60%',
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

  let output = blessed.Log({
    name: profile.id,
    parent: wrapper,
    scrollable: true,
    label: ` Chatting with ${profile.handle} `,
    top: 0,
    left: 0,
    width: '98%',
    height: '80%',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'blue',
      bg: null,
      border: {
        fg: 'red'
      }
    }
  });

  const input = blessed.Textbox({
    label: ' Enter a message: ',
    parent: wrapper,
    top: '80%',
    left: 0,
    width: '98%',
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

  input.focus();

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
      input.focus();
      return;
    case RETURN:
      let plaintext = input.getValue();
      let boxedDM = createDirectMessage(profile, plaintext, storage);
      output.log(`${storage.configuration.handle}: ${plaintext}`);
      network.room.sendTo(profile.id, boxedDM);
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

    parent.render();
  });

  input.key(['escape'], function(ch, key) {
    wrapper.label = '*** Closing DM ***';
    // TODO: REMOVE THE REFERENCE TO THIS UI IN e2eMessages!
    for (let idx in parent.children) {
      if (parent.children[idx].name == 'main-input') {
        parent.children[idx].focus();
        break;
      }
    }

    // TODO: broadcast a message that the DM was closed?
    // storage.e2eMessages[profile.id] = null;
    wrapper.destroy();
    storage.e2eMessages[profile.id] = null;
  });

  return {
    wrapper: wrapper,
    input: input,
    output: output,
    name: profile.id
  };
};

module.exports = {
  dmUI: dmUI,
};
