const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'wut' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: '/tmp/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/tmp/combined.log' }),
  ],
});

module.exports = {
  logger: logger
};
