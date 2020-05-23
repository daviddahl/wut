const os = require('os');

const APP_TITLE = '¿wut?';
const DEFAULT_TOPIC = '__wut__chat__';
const PEER_REFRESH_MS = 7000;
const STRING = 'string';
const HOME_DIR = os.homedir();
const WUT_HOME = `${HOME_DIR}/.wut`;
const SK_STORAGE_PATH = `${WUT_HOME}/keypair`;
const PK_STORAGE_PATH = `${WUT_HOME}/key.pub`;

module.exports = {
  APP_TITLE: APP_TITLE,
  DEFAULT_TOPIC: DEFAULT_TOPIC,
  PEER_REFRESH_MS: PEER_REFRESH_MS,
  STRING: STRING,
  HOME_DIR: HOME_DIR,
  WUT_HOME: WUT_HOME,
  SK_STORAGE_PATH: SK_STORAGE_PATH,
  PK_STORAGE_PATH: PK_STORAGE_PATH,
};
