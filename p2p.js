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

const signalServerPort = '9090'

const ssAddr = `/ip4/${signalServerIP()}/tcp/${signalServerPort}/ws/p2p-webrtc-star`;

const bootstrapSignalingServerMultiAddr =
      `/ip4/${signalServerIP()}/tcp/63785/ipfs/${signalServerCID()}`;

const bootstrappers = [
  ssAddr,
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/ip4/104.236.176.52/tcp/4001/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
  '/ip4/104.236.179.241/tcp/4001/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
  '/ip4/162.243.248.213/tcp/4001/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
  '/ip4/128.199.219.111/tcp/4001/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
  '/ip4/104.236.76.40/tcp/4001/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
  '/ip4/178.62.158.247/tcp/4001/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
  '/ip4/178.62.61.185/tcp/4001/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
  '/ip4/104.236.151.122/tcp/4001/p2p/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx'
]

const getPeerInfo = async () => {
  return PeerInfo.create()
}

// const wrtcStar = new WebRTCStar({ wrtc });

const libp2pBundle = async (opts) => {
  // TODO: use opts to make things more configurable
  const peerInfo = await getPeerInfo()

  return new Libp2p({
    peerInfo,
    // peerBook,
    modules: {
      transport: [WebRTCStar, TCP, Websockets],
      streamMuxer: [MPLEX],
      connEncryption: [SECIO],
      pubsub: GossipSub,
      peerDiscovery: [
        MulticastDNS,
        Bootstrap,
        // wrtc?
      ],
      dht: DHT,
    },
    config: {
      addresses: {
        swarm: [
          `/ip4/${signalServerIP()}/tcp/9090/wss/p2p-websocket-star`,
          "/ip4/0.0.0.0/tcp/4002",
          "/ip4/127.0.0.1/tcp/4003/ws",
        ],
      },
      dht: {                        // The DHT options (and defaults) can be found in its documentation
        kBucketSize: 20,
        enabled: true,
        randomWalk: {
          enabled: true,            // Allows to disable discovery (enabled by default)
          interval: 300e3,
          timeout: 10e3
        }
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
            bootstrappers,
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
      EXPERIMENTAL: {
        pubsub: true
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
