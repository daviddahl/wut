const { logger } = require('./logger');

const {
  box,
  secretbox,
  randomBytes
} = require('tweetnacl');

const {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64
} = require('tweetnacl-util');

const { Buffer } = require('buffer');

const OBJECT = 'object';
const STRING = 'string';

const convertKey = (obj) => {
  let key = new Uint8Array(box.publicKeyLength);
  for (let idx in obj) {
    key[idx] = obj[idx];
  }

  return key;
};

const coerceMessage = (message) => {
  if (typeof message === OBJECT && !Array.isArray(message)) {
    return Buffer.from(JSON.stringify(message));
  } else if (typeof message === STRING || Array.isArray(message)) {
    return message;
  }

  throw new Error(`Message format is ${typeof message}`);
};

const openDirectMessage = (msg, configuration) => {
  const openedMsg = box.open(
    msg.content,
    msg.nonce,
    msg.authorPubKey,
    configuration.keyPair.privateKey
  );

  let plaintext = encodeUTF8(openedMsg);

  return plaintext;
};

const createDirectMessage = (profile, plaintext, configuration) => {
  const DIRECT_MSG = 'dm';
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

  // logger.info(`createDirectMessage() ${plaintext}`);

  const nonce = randomBytes(box.nonceLength);
  // logger.info('nonce');
  // logger.info(nonce instanceof Uint8Array);
  let msg = decodeUTF8(plaintext);
  // logger.info(`msg`);
  // logger.info(msg instanceof Uint8Array);
  // logger.info('publicKey');
  // logger.info(profile.publicKey instanceof Uint8Array);
  // logger.info('secretKey:');
  // logger.info(configuration.keyPair.secretKey instanceof Uint8Array);

  logger.info(profile.publicKey instanceof Uint8Array);
  logger.info(profile);

  let boxed = box(msg, nonce, profile.publicKey, configuration.keyPair.secretKey);
  // logger.info('boxed');
  // logger.info(boxed);

  let dm = {
    handle: profile.handle,
    toCID: profile.id,
    fromCID: configuration.id,
    fromHandle: configuration.handle,
    nonce: nonce,
    content: boxed,
    authorPubKey: configuration.keyPair.publicKey,
    messageType: DIRECT_MSG,
  };

  return coerceMessage(dm);

};


// process.on('uncaughtException', (error) => {
//   logger.error(error);
// });

module.exports = {
  openDirectMessage: openDirectMessage,
  createDirectMessage: createDirectMessage,
  convertKey: convertKey,
};
