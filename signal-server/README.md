# ¿wut? signaling server

This is a wrapper around `libp2p-webrtc-star` and `libp2p`.

## Configuration

You must create a `PeerInfo` to run this server with. You'll need a peerInfo object as JSON:

```
// create PeerInfo object

let peerInfo = await PeerInfo.create()

let idJSON = peerInfo.id.toJSON()

```

Save `idJSON` and add this data to your environment as it will be consumed by the server thusly:

```js
const idJSON = {
  id: process.env.WUT_SIGNAL_SERVER_CID,
  privKey: process.env.WUT_SIGNAL_SERVER_PRIV_KEY,
  pubKey: process.env.WUT_SIGNAL_SERVER_PUB_KEY,
}

```

(See `./demoId.json` for an example JSON'd PeerInfo.id)

```bash
# Configure your environment like so:

export WUT_SIGNAL_SERVER_CID='Qmfoo123456...etc'
export WUT_SIGNAL_SERVER_PRIV_KEY='CAASpwkwggSjAgEAAoIBAQDKNKwPX4DJhYdGreAVaJy+efhIfbyczR0...etc'
export WUT_SIGNAL_SERVER_PUB_KEY='CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAo...etc'

```

## Run the server on a publicly-available server

`node signaling-server/server.js`

## Run the client

`node main.js`

The client requires env vars as well:

```bash
export SIGNAL_SERVER_CID='Qmfoo123456...etc'
export SIGNAL_SERVER_IP=199.x.x.x # ¿wut? signaling server IP address
```