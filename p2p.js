const TCP = require('libp2p-tcp');
const Websockets = require('libp2p-websockets');
const PeerInfo = require('peer-info')
const Libp2p = require('libp2p')
const WebRTCStar = require('libp2p-webrtc-star')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const wrtc = require('wrtc')
const GossipSub = require('libp2p-gossipsub')
const MulticastDNS = require('libp2p-mdns')
const Bootstrap = require('libp2p-bootstrap')
const DHT = require('libp2p-kad-dht')

const transportKey = WebRTCStar.prototype[Symbol.toStringTag]
debugger;

// FINE GRAIN CONFIG OPTIONS
const MDNS_INTERVAL_MS = 5000 // TODO: make this configurable via env vars or db records
const CONNECTION_MGR_POLL_MS = 5000
const RELAY_ENABLED = true
const HOP_ENABLED = true
const DHT_ENABLED = false
const RANDOM_WALK_ENABLED = false
const PUBSUB_ENABLED = true
const METRICS_ENABLED = true

const signalServerIP = () => {
  if (!process.env.SIGNAL_SERVER_IP) {
    throw new Error('process.env.SIGNAL_SERVER_IP required: without a signaling server, p2p peer discovery will not work');
  }
  return process.env.SIGNAL_SERVER_IP
};

const signalServerCID = () => {
  if (!process.env.SIGNAL_SERVER_CID) {
    throw new Error('process.env.SIGNAL_SERVER_CID required: without the signaling server CID, peer discovery will not work');
  }
  return process.env.SIGNAL_SERVER_CID
};

const signalServerPort = '15555'

const ssAddr = `/ip4/${signalServerIP()}/tcp/${signalServerPort}/ws/p2p-webrtc-star`;

const bootstrapSignalingServerMultiAddr =
      `/ip4/${signalServerIP()}/tcp/63785/ipfs/${signalServerCID()}`;

const getPeerInfo = async () => {
  return PeerInfo.create()
}

// const wrtcStar = new WebRTCStar({ wrtc });

const libp2pBundle = async (opts) => {
  // TODO: use opts to make things more configurable
  const peerInfo = await getPeerInfo()

  return new Libp2p({
    peerInfo,
    modules: {
      transport: [WebRTCStar, TCP, Websockets],
      streamMuxer: [MPLEX],
      connEncryption: [SECIO],
      pubsub: GossipSub,
      peerDiscovery: [
        MulticastDNS,
        Bootstrap,
      ]
    },
    config: {
      addresses: {
        swarm: [
          `/ip4/${signalServerIP()}/tcp/15555/wss/p2p-websocket-star`,
          "/ip4/0.0.0.0/tcp/4002",
          "/ip4/0.0.0.0/tcp/4003/ws",
        ],
      },
      autoDial: true, // auto dial to peers we find when we have less peers than `connectionManager.minPeers`
      mdns: {
        interval: MDNS_INTERVAL_MS,
        enabled: true
      },
      peerDiscovery: {
        webRTCStar: {
          enabled: true
        },
        bootstrap: {
          interval: 60e3,
          enabled: true,
          list: [
            '/ip4/127.0.0.1/tcp/63785/ipfs/QmWjz6xb8v9K4KnYEwP5Yk75k5mMBCehzWFLCvvQpYxF3d'
          ]
        },
      },
      transport: {
        [transportKey]: {
          wrtc
        }
      },
      pubsub: {
        enabled: true,
        emitSelf: true,
        signMessages: true,
        strictSigning: true,
      },
      dht: {
      enabled: true,
      randomWalk: {
        enabled: true
      }
    },
    EXPERIMENTAL: {
      pubsub: true
    }
    }
  })
}

module.exports = {
  libp2pBundle: libp2pBundle,
  signalServerCID: signalServerCID,
  signalServerIP: signalServerIP,
  signalServerPort: signalServerPort,
  ssAddr: ssAddr,
}
