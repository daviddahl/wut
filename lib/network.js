const PROFILE_MSG = 'profile';

const EventEmitter = require('events');
const { Buffer } = require('buffer');

const { logger } = require('./logger');
const { DEFAULT_TOPIC } = require('./config');



class Network {

  constructor (configuration, nodeId, room) {
    this.configuration = configuration;
    this.nodeId = nodeId;
    this.room = room;
  }

  broadcastProfile (cid) {
    let profile = JSON.stringify({
      messageType: PROFILE_MSG,
      handle: this.configuration.handle.trim(),
      publicKey: this.configuration.keyPair.publicKey,
      bio: this.configuration.bio,
      id: this.nodeId.id,
    });

    if (cid) {
      this.room.sendTo(cid, profile);
    } else {
      this.room.broadcast(profile);
    }
  }

  getPeers () {
    return this.room.getPeers();
  }
}


module.exports = {
  Network: Network,
};
