// const { logger } = require('./logger');

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
    authorPubKey: configuration.keyPair.publicKey
  };

  return dm;

};


// process.on('uncaughtException', (error) => {
//   logger.error(error);
// });

module.exports = {
  openDirectMessage: openDirectMessage,
  createDirectMessage: createDirectMessage,
};
