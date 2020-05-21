const blessed = require('blessed');

const { logger } = require('./logger.js');

const { openDirectMessage, createDirectMessage } = require('./messages.js');

const e2eUI = (parent, profile, configuration, room) => {
  if (!parent && !profile && !room) {
    throw new Error('Parent node & profile required');
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

  input.on('keypress', (value, key) => {

    const RETURN = 'return';
    const BACKSPACE = 'backspace';
    const SCROLL_UP = '\u001bOA';
    const SCROLL_DOWN = '\u001bOB';
    const UP = 'up';
    const DOWN = 'down';

    // TODO: handle control-a, -x, etc

    switch (key.name) {
    case RETURN:
      let msg = input.getValue();

      let boxed = createDirectMessage(profile, msg, configuration);

      room.sendTo();
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

    parent.render();
  });

  input.key(['escape'], function(ch, key) {
    wrapper.label = '*** Closing DM ***';
    // TODO: REMOVE THE REFERENCE TO THIS UI IN e2eMessages!
    for (let idx in parent.children) {
      // logger.info(parent.children[idx]);
      if (parent.children[idx].name == 'main-input') {
        parent.children[idx].focus();
        break;
      }
    }

    return wrapper.destroy();
  });

  let output = blessed.Log({
    name: profile.id,
    parent: wrapper,
    scrollable: true,
    label: `Chatting with ${profile.handle}`,
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

  return {
    wrapper: wrapper,
    input: input,
    output: output,
    name: profile.id
  };
};

module.exports = {
  e2eUI: e2eUI,
};
