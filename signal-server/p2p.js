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
const SignalingServer = require('libp2p-webrtc-star/src/sig-server')
const demoIdJson = require('./demoId.json')

const transportKey = WebRTCStar.prototype[Symbol.toStringTag]

let idJSON;

try {
  idJSON = {
    id: process.env.WUT_SIGNAL_SERVER_CID,
    privKey: process.env.WUT_SIGNAL_SERVER_PRIV_KEY,
    pubKey: process.env.WUT_SIGNAL_SERVER_PUB_KEY
  }
} catch (ex) {
  console.error(ex)
  idJSON = demoIdJson
}

debugger;

let ssAddr;

// FINE GRAIN CONFIG OPTIONS
const MDNS_INTERVAL_MS = 5000 // TODO: make this configurable via env vars or db records
const CONNECTION_MGR_POLL_MS = 5000
const RELAY_ENABLED = true
const HOP_ENABLED = true
const DHT_ENABLED = true
const RANDOM_WALK_ENABLED = true
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

const getPeerInfo = async () => {
  return PeerInfo.create(idJSON)
}

const libp2pBundle = async (opts) => {
  // TODO: use opts to make things more configurable
  const peerInfo = await getPeerInfo()

  // Wildcard listen on TCP and Websocket
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/63785')
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/63786/ws')

  const signalingServer = await SignalingServer.start({
    port: 15555
  })
  ssAddr = `/ip4/${signalingServer.info.host}/tcp/${signalingServer.info.port}/ws/p2p-webrtc-star`
  console.info(`Signaling server running at ${ssAddr}`)
  peerInfo.multiaddrs.add(`${ssAddr}/p2p/${peerInfo.id.toB58String()}`)

  debugger;

  return new Libp2p({
    peerInfo,
    modules: {
      transport: [ WebRTCStar, TCP, Websockets ],
      streamMuxer: [ MPLEX ],
      connEncryption: [ SECIO ],
      pubsub: GossipSub,
      peerDiscovery: [
        MulticastDNS,
        Bootstrap,
      ]
    },
    config: {
      relay: {           // Circuit Relay options (this config is part of libp2p core configurations)
        enabled: true,   // Allows you to dial and accept relayed connections. Does not make you a relay.
        hop: {
          enabled: true, // Allows you to be a relay for other peers
          active: true   // You will attempt to dial destination peers if you are not connected to them
        }
      },
      EXPERIMENTAL: {
        pubsub: true
      },
      autoDial: true, // auto dial to peers we find when we have less peers than `connectionManager.minPeers`
      mdns: {
        interval: MDNS_INTERVAL_MS,
        enabled: true
      },
      peerDiscovery: {
        // webRTCStar: {
        //   enabled: true
        // },
        bootstrap: {
          interval: 60e3,
          enabled: true,
          list: [
            `/ip4/127.0.0.1/tcp/63785/ipfs/${peerInfo.id.toB58String()}`,
          ]
        },
      },
      transport: {
        [transportKey]: {
          wrtc
        },
      },
      pubsub: {
        enabled: true,
        emitSelf: true,
        signMessages: true,
        strictSigning: true,
      },
      dht: {
        enabled: false,
        randomWalk: {
          enabled: false
        }
      },
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
