const TCP = require('libp2p-tcp');
const { Upgrader } = require('@libp2p/upgrader');
const wrtc = require('wrtc');
const WStar = require('libp2p-webrtc-star');
const Websockets = require('libp2p-websockets');
const WebrtcStar = require('libp2p-webrtc-star');

let upgrader = new Upgrader();

const wstar = new WStar({ wrtc, upgrader });

const signalServerIP = () => {
  if (!process.env.SIGNAL_SERVER_IP) {
    throw new Error('process.env.SIGNAL_SERVER_IP required: without a signaling server, p2p peer discovery will not work');
  }
  return process.env.SIGNAL_SERVER_IP;
};

const signalServerCID = () => {
  if (!process.env.SIGNAL_SERVER_CID) {
    throw new Error('process.env.SIGNAL_SERVER_CID required: without the signaling server CID, peer discovery will not work');
  }
  return process.env.SIGNAL_SERVER_CID;
};

const signalServerPort = '9090';

const ssAddr = `/ip4/${signalServerIP()}/tcp/${signalServerPort}/ws/p2p-webrtc-star`;

const bootstrapSignalingServerMultiAddr =
      `/ip4/${signalServerIP()}/tcp/63785/ipfs/${signalServerCID()}`;

const DEFAULT_CONFIG = {
  init: true,
  start: true,
  config: {
    EXPERIMENTAL: {
      pubsub: true
    },
    peerDiscovery: {
      bootstrap: {
        interval: 60e3,
        enabled: true,
        list: [
          bootstrapSignalingServerMultiAddr,
        ],
      },
    },
    dht: {
      kBucketSize: 20,
      enabled: true,
      randomWalk: {
        enabled: true
      },
    },
    modules: {
      transport: [ TCP, Websockets, wstar ],
      peerDiscovery: [wstar.discovery]
    }
  }
};

module.exports = {
  nodeConfig: DEFAULT_CONFIG
};
