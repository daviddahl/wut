const blessed = require('blessed')

const { logger } = require('./logger')

const { openDirectMessage, createDirectMessage } = require('./messages')

const {
  TAB,
  RETURN,
  BACKSPACE,
  SCROLL_UP,
  SCROLL_DOWN,
  UP,
  DOWN
} = require('./constants')

const dmUI = (parent, profile, storage, network) => {
  // Note: parent === screen in mainUI obj
  if (!parent && !profile && !storage && !network) {
    throw new Error('Parent node, profile, config and network required');
  }

  // TODO: Since the terminal styles are the same/similar between this and main-ui.js, do we want to consolidate some of the blessed Box, logs, textboxs, etc
  // to a constructor that takes common options that can be overriden? Would likely reduce the lines of code in main-ui and here which might help with readability

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

    // TODO: might be good to make these an enum like class?
    // Looks to be reused in main-ui.js

    // TODO: handle control-a, -x, etc

    // TODO: might be good to have some type of mixinable behavior or default behavior on
    // input that can be overriden. Only reason I think it might be worth exploring
    // is the TAB, BACKSPACE, UP, DOWN, and default cases are shared here and in main-ui.js.

    // However, we want to make sure we do it gracefully because this might be overengineering, and if we ulimately decide
    // against it I totally understand. If we go down that route, we probs want to make it as simple as possible to understand
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
