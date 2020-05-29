// derived from original custom libp2p bundle found here:
// https://github.com/ipfs/js-ipfs/blob/master/examples/custom-libp2p/index.js
// Copyright 2020 Protocol Labs

'use strict'

const Libp2p = require('libp2p')
const IPFS = require('ipfs')
const TCP = require('libp2p-tcp')
const MulticastDNS = require('libp2p-mdns')
const Bootstrap = require('libp2p-bootstrap')
const SPDY = require('libp2p-spdy')
const KadDHT = require('libp2p-kad-dht')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')

const Websockets = require('libp2p-websockets')
const WebrtcStar = require('libp2p-webrtc-star')
const wrtc = require('wrtc')

// WTF?
const Upgrader = require('./node_modules/libp2p/src/upgrader')

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

/**
 * Options for the libp2p bundle
 * @typedef {Object} libp2pBundle~options
 * @property {PeerInfo} peerInfo - The PeerInfo of the IPFS node
 * @property {PeerBook} peerBook - The PeerBook of the IPFS node
 * @property {Object} config - The config of the IPFS node
 * @property {Object} options - The options given to the IPFS node
 */

/**
 * This is the bundle we will use to create our fully customized libp2p bundle.
 *
 * @param {libp2pBundle~options} opts The options to use when generating the libp2p node
 * @returns {Libp2p} Our new libp2p node
 */
const libp2pBundle = async (opts) => {
  // Set convenience variables to clearly showcase some of the useful things that are available
  const peerInfo = opts.peerInfo
  const peerBook = opts.peerBook
  const bootstrapList = opts.Bootstrap || [ bootstrapSignalingServerMultiAddr ]

  const upgrader = new Upgrader({ localPeer: peerInfo })

  const wrtcStar = new WebrtcStar({ wrtc, upgrader })

  const bundleConfig = {
    peerInfo,
    peerBook,
    // Lets limit the connection managers peers and have it check peer health less frequently
    connectionManager: {
      minPeers: 25,
      maxPeers: 100,
      pollInterval: CONNECTION_MGR_POLL_MS
    },
    modules: {
      transport: [
        TCP,
        // Websockets,
        // wrtcStar
      ],
      streamMuxer: [
        MPLEX,
        SPDY
      ],
      connEncryption: [
        SECIO
      ],
      peerDiscovery: [
        MulticastDNS,
        Bootstrap,
        wrtcStar.discovery
      ],
      dht: KadDHT
    },
    config: {
      peerDiscovery: {
        autoDial: true, // auto dial to peers we find when we have less peers than `connectionManager.minPeers`
        mdns: {
          interval: MDNS_INTERVAL_MS,
          enabled: true
        },
        bootstrap: {
          interval: 30e3,
          enabled: true,
          list: bootstrapList
        }
      },
      // Turn on relay with hop active so we can connect to more peers
      relay: {
        enabled: RELAY_ENABLED,
        hop: {
          enabled: HOP_ENABLED,
          active: true
        }
      },
      dht: {
        enabled: DHT_ENABLED,
        kBucketSize: 20,
        randomWalk: {
          enabled: RANDOM_WALK_ENABLED,
          interval: 30e3,
          timeout: 5e3 // End the query quickly since we're running so frequently
        }
      },
      pubsub: {
        enabled: PUBSUB_ENABLED
      }
    },
    metrics: {
      enabled: METRICS_ENABLED,
      computeThrottleMaxQueueSize: 1000,  // How many messages a stat will queue before processing
      computeThrottleTimeout: 2000,       // Time in milliseconds a stat will wait, after the last item was added, before processing
      movingAverageIntervals: [           // The moving averages that will be computed
        60 * 1000, // 1 minute
        5 * 60 * 1000, // 5 minutes
        15 * 60 * 1000 // 15 minutes
      ],
      maxOldPeersRetention: 50            // How many disconnected peers we will retain stats for
    }
  }

  // Build and return our libp2p node
  // n.b. for full configuration options, see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md
  return new Libp2p(bundleConfig)
}

async function main () {
  // Now that we have our custom libp2p bundle, let's start up the ipfs node!
  const pi = await PeerInfo.create();

  const opts = {
    peerInfo: pi,
  }

  libp2pBundle(opts).then((bundle) => {
    debugger;
    IPFS.create({
      libp2p: bundle
    }).then((node) => {

      // Lets log out the number of peers we have every 2 seconds
      setInterval(async () => {
        try {
          const peers = await node.swarm.peers()
          console.log(`The node now has ${peers.length} peers.`)
        } catch (err) {
          console.log('An error occurred trying to check our peers:', err)
        }
      }, 2000)

      // Log out the bandwidth stats every 4 seconds so we can see how our configuration is doing
      setInterval(async () => {
        try {
          const stats = await node.stats.bw()
          console.log(`\nBandwidth Stats: ${JSON.stringify(stats, null, 2)}\n`)
        } catch (err) {
          console.log('An error occurred trying to check our stats:', err)
        }
      }, 4000)

    }).catch((ex) => {
      console.error(ex);
      console.error(ex.stack);
    })

  }).catch((ex) => {
    console.error(ex)
    console.error(ex.stack);
  });

}

main()
