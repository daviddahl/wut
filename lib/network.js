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
    // this.room2 = room2;
    // this.pubsubEmitter = new EventEmitter();
  }

  async initPubsub () {
    try {
      await this.room2.pubsub.subscribe(DEFAULT_TOPIC, (msg) => {
        logger.info(msg.data.toString());
        this.pubsubEmitter.emit('subscribed', DEFAULT_TOPIC, msg.toString());
      });
    } catch (ex) {
      logger.error(ex);
      logger.error(ex.stack);
    }

    setInterval(() => {
      let buff = Buffer.from('test message');
      this.room2.pubsub.publish(DEFAULT_TOPIC, buff);
      this.pubsubEmitter.emit('message', DEFAULT_TOPIC, buff);
    }, 1000);
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
