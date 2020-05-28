const { createLibp2p } = require('libp2p');
const Websockets = require('libp2p-websockets');
const WebrtcStar = require('libp2p-webrtc-star');
const wrtc = require('wrtc');
const TCP = require('libp2p-tcp');
const MPLEX = require('libp2p-mplex');
const Secio = require('libp2p-secio');
const KadDHT = require('libp2p-kad-dht');
const Bootstrap = require('libp2p-bootstrap');
const PeerInfo = require('peer-info');
const MDNS = require('libp2p-mdns');

let p2p;

const DEFAULT_TOPIC = '__wut__';
const topics = ['__wut__'];

const wrtcStar = new WebrtcStar({ wrtc });

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

console.log(bootstrapSignalingServerMultiAddr);

createLibp2p({
  modules: {
    transport: [ TCP, Websockets, wrtcStar ],
    streamMuxer: [ MPLEX ],
    connEncryption: [ Secio ],
    peerDiscovery: [ Bootstrap, MDNS, wrtcStar.discovery ],
    dht: KadDHT,
  },
  config: {
    // relay: {
    //   enabled: true,
    //   hop: {
    //     enabled: true,
    //     active: false
    //   }
    // },
    // pubsub: {
    //   enabled: true,
    //   emitSelf: true,
    //   signMessages: true,
    //   strictSigning: true,
    // },
    dht: {
      kBucketSize: 20,
      enabled: true,
      randomWalk: {
        enabled: true,
        interval: 300e3,
        timeout: 10e3
      }
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
    EXPERIMENTAL: {
      pubsub: true
    }
  }
}, (err, res) => {
  if (err) throw err;

  let keys = Object.keys(res);
  console.log(keys);
  console.log(Object.keys(res['pubsub']));

  p2p = res;

  const multiAddrs = [
    // `${ssAddr}/p2p/${p2p.peerInfo.id.toB58String()}`,
    '/ip4/0.0.0.0/tcp/63785',
    '/ip4/0.0.0.0/tcp/63785/ws',
    `/ip4/${signalServerIP()}/tcp/15555/ws/p2p-webrtc-star/p2p/${p2p.peerInfo.id.toB58String()}`,
  ];

  multiAddrs.forEach((addr) => {
    // Add all of the bootsrap node multiaddrs here
    // TODO: make this more configurable, e.g.: pull an additional set of addrs from env / db
    console.log(addr);
    p2p.peerInfo.multiaddrs.add(addr);
  });

  p2p.start((err) => {
    if (err) throw err;

    p2p.on('peer:connect', (peerInfo) => {
      console.info(`Connected to ${peerInfo.id.toB58String()}!`);
    });

    // console.log(res.pubsub);

    // p2p.pubsub.subscribe(DEFAULT_TOPIC, (msg) => {
    //   console.log(msg);
    // });

    // setInterval(() => {
    //   p2p.pubsub.publish(DEFAULT_TOPIC, 'Hi!');
    // }, 3000);

  });

});
