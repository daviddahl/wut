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

  let nonce = randomBytes(24);
  let msg = decodeUTF8(plaintext);
  let boxed = box(msg, nonce, profile.publicKey, configuration.privateKey);

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


module.exports = {
  openDirectMessage: openDirectMessage,
  createDirectMessage: createDirectMessage,
};
