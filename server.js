const FS      = require('fs');
const YAML    = require('yaml');
const net     = require('net');
const moment  = require('moment-timezone');
const sql     = require('mssql');
const yargs   = require('yargs');

const codes   = YAML.parse(
  FS.readFileSync('codes.yml', 'utf8')
).codes;

const config  = YAML.parse(
  FS.readFileSync('config.yml', 'utf8')
);

/*
 *  Specify default range to timestamps
 */
if(config.server.diff.negative > 0) {
  config.server.diff.negative = -20;
}
if(config.server.diff.positive < 0) {
  config.server.diff.positive = 40;
}

/*
 *  Parse arguments like port and debug.
 */
const argv = yargs
    .option('port', {
        alias: 'p',
        description: 'Specify a port for this instance.',
        type: 'number',
    })
    .option('debug', {
        alias: 'd',
        description: 'Debug messages to console.',
        type: 'boolean',
    })
    .help()
    .alias('help', 'h')
    .argv;

if(argv.port) {
  config.server.port = argv.port;
}

if(argv.debug) {
  config.dispatcher.push({
    type: 'console',
    format: 'human'
  });
}

/*
 *  RAW dispatcher to console. Useful for debugging.
 */
const consoleDispatch = function(data, bot) {
  if(bot.format !== undefined && bot.format != 'raw' && data.type == 'SIA-DCS') {
    let needle = codes.filter((item) => item.code == data.sia.code);
    if(needle.length == 1) {
      data.sia.shortDesc = needle[0].shortDescription;
      data.sia.longDesc = needle[0].longDescription;
      data.sia.addressType = needle[0].address;
    }
  }
  console.log({data});
};

/*
 *  MSSQL Dispatcher. Execute tables.sql and procedure.sql first.
 */
const mssqlDispatch = function(data, bot) {
  if(bot.format !== undefined && bot.format != 'raw') {
    let needle = codes.filter((item) => item.code == data.sia.code);
    if(needle.length == 1) {
      data.sia.shortDesc = needle[0].shortDescription;
      data.sia.longDesc = needle[0].longDescription;
      data.sia.addressType = needle[0].address;
    }
  }
  let database = {
    user: bot.user,
    password: bot.password,
    server: bot.server,
    database: bot.database,
    port: bot.port?bot.port:1433
  };
  sql.connect(database)
  .then(pool => {
    return pool.request()
           .input('Code', data.sia.code)
           .input('Title', data.sia.shortDesc)
           .input('Description', data.sia.longDesc)
           .input('AddressType', data.sia.addressType)
           .input('Account', data.account)
           .input('Type', data.type)
           .input('Prefix', data.prefix)
           .input('Receiver', data.receiver)
           .input('Address', data.sia.address)
           .input('Timestamp', data.timestamp.pe)
           .execute('registerSIAevent');
  }).then(result => {
    if(result.returnValue != 0) {
      console.log('Execution of stored procedure has not been successful. Check "registerSIAevent" stored procedure.');
    }
  }).catch(err => {
    console.error(err);
  });

};

/*
 *  Send the results to each one of dispatcher configured.
 */
const dispatch = function(data) {
  if(config.dispatcher !== undefined) {
    config.dispatcher.forEach(bot => {
      switch(bot.type) {
        case 'mssql':
          mssqlDispatch(data, bot);
          break;
        case 'console':
          consoleDispatch(data, bot);
          break;
        default:
          console.info(`Unknown dispatcher ${bot.type}.`);
      }
    });
  }
};

/*
 *  CRC-16
 *  Poly: 0x8005 (CRC-16/ARC)
 */
const crc16 = function(data) {
  const crctab16 = new Uint16Array([
    0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280, 0xC241,
    0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481, 0x0440,
    0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81, 0x0E40,
    0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880, 0xC841,
    0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81, 0x1A40,
    0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80, 0xDC41,
    0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680, 0xD641,
    0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081, 0x1040,
    0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281, 0x3240,
    0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480, 0xF441,
    0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80, 0xFE41,
    0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881, 0x3840,
    0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80, 0xEA41,
    0xEE01, 0x2EC0, 0x2F80, 0xEF41, 0x2D00, 0xEDC1, 0xEC81, 0x2C40,
    0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681, 0x2640,
    0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080, 0xE041,
    0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281, 0x6240,
    0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480, 0xA441,
    0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80, 0xAE41,
    0xAA01, 0x6AC0, 0x6B80, 0xAB41, 0x6900, 0xA9C1, 0xA881, 0x6840,
    0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80, 0xBA41,
    0xBE01, 0x7EC0, 0x7F80, 0xBF41, 0x7D00, 0xBDC1, 0xBC81, 0x7C40,
    0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681, 0x7640,
    0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080, 0xB041,
    0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280, 0x9241,
    0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481, 0x5440,
    0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81, 0x5E40,
    0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880, 0x9841,
    0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81, 0x4A40,
    0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80, 0x8C41,
    0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680, 0x8641,
    0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081, 0x4040
  ]);
  let len = data.length;
  let buffer = 0;
  let crc;
  while (len--) {
    crc = ((crc >>> 8) ^ (crctab16[(crc ^ (data[buffer++])) & 0xff]));
  }
  return crc;
};

/*
 *  Transform CRC to hex and 4 zero-padding string
 */
const crc16str = function(str) {
  return crc16(Buffer.from(str)).toString(16).toUpperCase().padStart(4, "0");
};

/*
 *  Calculate the size of a message and transform to a 4 zero-padding string in hex
 */
const msgSize = function(str) {
  return str.length.toString(16).toUpperCase().padStart(4, "0");
};

/*
 *  Transform socket data block to JSON object
 */
const parseRequest = function(data) {
  let csrTimestamp = moment.tz(new Date(), 'UTC');
  let peTimestamp;
  let chunk = data.toString('utf8');
  let msg = chunk.substring(chunk.indexOf('"'));
  msg = msg.substring(0, msg.lastIndexOf("\r"));
  let crc = crc16str(msg);
  let size = msgSize(msg);
  let type = msg.substring(1, msg.lastIndexOf('"'));
  let id = msg.substring(msg.lastIndexOf('"') + 1, msg.lastIndexOf('['));
  let msgTimestamp = msg.substring(msg.lastIndexOf(']') + 1);
  if(msgTimestamp != '') {
    peTimestamp = moment.tz(msgTimestamp, '_HH:mm:ss,MM-DD-YYYY', 'UTC');
  } else {
    peTimestamp = moment(csrTimestamp);
  }
  let timestamp = {
    pe: parseInt(peTimestamp.format('X')),
    csr: parseInt(csrTimestamp.format('X')),
    diff: parseInt(peTimestamp.format('X')) - parseInt(csrTimestamp.format('X'))
  }
  let servertimestamp = moment().format('X');
  let account = id.substring(id.indexOf('#'));
  let prefix = id.substring(id.indexOf('L'), id.indexOf('#'));
  let receiver = id.indexOf('R') != -1?id.substring(id.indexOf('R'), id.indexOf('L')):'';
  let sequence = id.indexOf('R') != -1?id.substring(0, id.indexOf('R')):id.substring(0, id.indexOf('L'));

  let block = msg.substring(msg.indexOf('[') + 1, msg.indexOf(']'));
  let sia = {
    data: null,
    code: null,
    address: null,
    shortDesc: null,
    longDesc: null,
    addressType: null
  };

  let responseMsg;
  if(timestamp.diff < config.server.diff.negative || timestamp.diff > config.server.diff.positive) {
    let timestamp = csrTimestamp.format('_HH:mm:ss,MM-DD-YYYY');
    responseMsg = `"NAK"0000R0L0[]${timestamp}`;
  } else {
    responseMsg = `"ACK"${sequence}${receiver}${prefix}${account}[]`;
  }
  if(receiver == '') {
    receiver = null;
  }
  if(block == '') {
    block = null;
  } else {
    sia.data = block.substring(block.indexOf('|') + 1);
    let temp = sia.data.substring(sia.data.indexOf('N') + 1);
    if(temp.substring(0, 2) == 'ri') {
      temp = temp.substring(temp.indexOf('/') + 1)
    }
    sia.code = temp.substring(0, 2);
    sia.address = temp.substring(2);
  }
  let responseCrc = crc16str(responseMsg);
  let responseSize = msgSize(responseMsg);
  let response = `\n${responseCrc}${responseSize}${responseMsg}\r`;

  return {chunk, msg, crc, size, type, id, account, prefix, receiver, sequence, block, sia, timestamp, response};
};

/*
 *  Start a TCP server to dispatch every block of data received
 */
let server = net.createServer(function(socket) {
  socket.on('error', function(err) {
    console.error(err)
  });
  socket.on('data', function(data) {
    let request = parseRequest(data);
    dispatch(request);
    let response = request.response;
    let status = socket.write(response);
  });
});

/*
 *  Start to listen in configured or argument passed port.
 */
server.listen(config.server.port);
