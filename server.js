const fs = require('fs')
const PeerId = require('peer-id')
const KEYS_STORAGE_PATH = process.env.SIGNAL_SERVER_KEYS_STORAGE_PATH || `/root/.signal_server_keys`

const SignalingServer = require('libp2p-webrtc-star/src/sig-server')

const start = (callback) => {
  SignalingServer.start({
    port: 15555
  })
  .then(server => {
    callback(null, server)
  })
  .catch(callback)
}

const createPeer = async () => {
  try {
    let peer = await PeerId.create()
    return peer
  } catch (ex) {
    console.error(ex)
    console.error(ex.stack)
    return null
  }
}

const getServerPeerKeys = () => {
  if (fs.existsSync(KEYS_STORAGE_PATH)) {
    return fs.readFileSync(KEYS_STORAGE_PATH, 'utf-8')
  }
  return null
}

const persistPeerKeys = (str) => {
  // Check for existence first
  if (!fs.existsSync(KEYS_STORAGE_PATH)) {
    fs.writeFile(KEYS_STORAGE_PATH, str, (err) => {
      if (err) throw err
    })
  }
}
