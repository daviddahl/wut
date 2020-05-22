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

Object.prototype.size = (obj) => {
  let size = 0;
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }

  return size;
};

const PUB_KEY = 'pub';
const SEC_KEY = 'sec';
const NONCE = 'non';

const convertObjectToUint8 = (obj, objType=null) => {
  if (!obj) {
    throw new Error('Arg size required!');
  }
  if (obj instanceof Uint8Array) {
    return obj;
  }

  let len;

  if (objType == PUB_KEY) {
    len = box.publicKeyLength;
  } else if (objType == SEC_KEY) {
    len = box.secretKeyLength;
  } else if (objType == NONCE) {
    len = box.nonceLength;
  } else {
    len = obj.size(obj);
  }

  let result = new Uint8Array(len);
  for (let idx in obj) {
    result[idx] = obj[idx];
  }

  logger.info(`objType: ${objType} len: ${len}`);

  return result;
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
  logger.info('openDirectMessage()');
  logger.info(msg);
  logger.info(typeof msg);

  if (!msg.content) {
    throw new Error('Message content is null');
  }

  let content = convertObjectToUint8(msg.content);
  logger.info(content);
  let nonce = convertObjectToUint8(msg.nonce, NONCE);
  logger.info(nonce);
  let pk = convertObjectToUint8(msg.authorPubKey, PUB_KEY);
  logger.info(pk);
  let sk = convertObjectToUint8(configuration.keyPair.secretKey, SEC_KEY);
  logger.info(sk);

  const openedMsg = box.open(content, nonce, pk, sk);
  logger.info(`openedMsg: ${openedMsg}`);

  let plaintext = null;

  if (openedMsg) {
    plaintext = encodeUTF8(openedMsg);
  }

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
  convertObjectToUint8: convertObjectToUint8,
};
