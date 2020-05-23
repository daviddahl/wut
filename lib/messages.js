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

// TODO: Might be good to make these an enum like class?
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

  switch(objType){
  case PUB_KEY:
    len = box.publicKeyLength;
    break;
  case SEC_KEY:
    len = box.secretKeyLength;
    break;
  case NONCE:
    len = box.nonceLength;
    break;
  default:
    len = Object.keys(obj).length;
  }

  let result = new Uint8Array(len);
  for (let idx in obj) {
    result[idx] = obj[idx];
  }

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

  if (!msg.content) {
    throw new Error('Message content is null');
  }

  let content = convertObjectToUint8(msg.content);
  let nonce = convertObjectToUint8(msg.nonce, NONCE);
  let pk = convertObjectToUint8(msg.authorPubKey, PUB_KEY);
  let sk = convertObjectToUint8(configuration.keyPair.secretKey, SEC_KEY);

  const openedMsg = box.open(content, nonce, pk, sk);

  let plaintext = null;

  if (openedMsg) {
    plaintext = encodeUTF8(openedMsg);
  }

  return plaintext;
};

const createDirectMessage = (profile, plaintext, storage) => {
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

  const nonce = randomBytes(box.nonceLength);
  let msg = decodeUTF8(plaintext);
  let boxed = box(msg, nonce, profile.publicKey, storage.configuration.keyPair.secretKey);

  let dm = {
    handle: profile.handle,
    toCID: profile.id,
    fromCID: storage.configuration.id,
    fromHandle: storage.configuration.handle,
    nonce: nonce,
    content: boxed,
    authorPubKey: storage.configuration.keyPair.publicKey,
    messageType: DIRECT_MSG,
  };

  return coerceMessage(dm);

};

module.exports = {
  openDirectMessage: openDirectMessage,
  createDirectMessage: createDirectMessage,
  convertObjectToUint8: convertObjectToUint8,
};
