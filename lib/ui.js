const blessed = require('blessed');

const e2eUI = (parent, name) => {
  if (!parent && !name) {
    throw new Error('Parent node & name required');
  }

  const wrapper = blessed.Box({
    label: ' ...DM... ',
    border: {
      type: 'line'
    },
    name: name,
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

  let output = blessed.Log({
    name: name,
    parent: wrapper,
    scrollable: true,
    label: ' ..initializing... ',
    top: '25%',
    left: '25%',
    width: '50%',
    height: '60%',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'blue',
      bg: null,
      border: {
        fg: 'green'
      }
    }
  });

  return {
    wrapper: wrapper,
    input: input,
    output: output,
    name: name
  };
};

module.exports = {
  e2eUI: e2eUI,
};