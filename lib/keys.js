const fs = require('fs');
const path = require('path');

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

const {
  STRING,
  SK_STORAGE_PATH,
  PK_STORAGE_PATH,
  HOME_DIR,
  WUT_HOME
} = require('./config');

class Keys {
  constructor (init=false) {
    if (init) {
      const kp = this.generateKeypair();
      const pubKey = kp.publicKey;

      try {
        this.keypairToDisk(kp);
        this.pubKeyToDisk(pubKey);
      } catch (ex) {
        console.error(ex);
        console.error(ex.stack);
        logger.error(ex);
        logger.error(ex.stack);
      }
    }
  }

  generateKeypair () {
    return box.keyPair();
  }

  pubKeyToString (pubKey) {
    if (!pubKey) {
      throw new Error('Error: pubKey arg required');
    }

    return JSON.stringify(pubKey);
  }

  pubKeyStringToBase64 (pubKeyStr) {
    if (!pubKeyStr && !typeof pubKeyStr == STRING) {
      throw new Error('Error: pubKeyStr arg required');
    }

    return encodeBase64(pubKeyStr);
  }

  pubKeyToDisk (pubKey) {
    const pubStr = this.pubKeyToString(pubKey);
    const pubB64 = this.pubKeyStringToBase64(pubStr);
    const rv = this.persistPubKey(pubB64);

    if (!rv) {
      throw new Error('Could not persist pubKey');
    }

    return rv;
  }

  persistPubKey (pubB64) {
    if (!pubB64 && !typeof pubB64 == STRING) {
      throw new Error('Error: pubB64 arg required');
    }
    // Check for existence first
    if (!fs.existsSync(PK_STORAGE_PATH)) {
      fs.writeFile(PK_STORAGE_PATH, pubB64, (err) => {
        if (err) throw err;
      });
    }

    return true;
  }

  keypairToString (kp) {
    if (!kp && !kp.publicKey && !kp.privateKey) {
      throw new Error('Error: keyPair arg required');
    }

    return JSON.stringify(kp);
  }

  keypairStringToBase64 (kpStr) {
    if (!kpStr && !typeof kpStr == STRING) {
      throw new Error('Error: keyPair arg required');
    }

    return encodeBase64(kpStr);
  }

  keypairToDisk (kp) {
    const kpStr = this.keypairToString(kp);
    const kpB64 = this.keypairStringToBase64(kpStr);
    const rv = this.persistKeypair(kpB64);

    if (!rv) {
      throw new Error('Could not persist keypair');
    }

    return rv;
  }

  persistKeypair (kpB64) {
    if (!kpB64 && !typeof kpB64 == STRING) {
      throw new Error('Error: kpB64 arg required');
    }
    // Check for existence first
    if (!fs.existsSync(WUT_HOME)) {
      this.createAppHome();
    }

    fs.writeFile(SK_STORAGE_PATH, kpB64, (err) => {
      if (err) throw err;
    });

    return true;
  }

  createAppHome () {
    fs.mkdirSync(WUT_HOME);
  }
}

module.exports = {
  Keys: Keys,
};
