const net = require('net');

const PORT = process.env.PORT || 3000;

const server = net.createServer((socket) => {
  socket.once('data', (data) => {
    if (data[0] !== 0x05) return socket.destroy();

    socket.write(Buffer.from([0x05, 0x00]));

    socket.once('data', (data) => {
      const cmd = data[1];
      const addrType = data[3];

      let host, port;

      if (addrType === 0x01) {
        host = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`;
        port = data.readUInt16BE(8);
      } else if (addrType === 0x03) {
        const len = data[4];
        host = data.slice(5, 5 + len).toString();
        port = data.readUInt16BE(5 + len);
      } else {
        return socket.destroy();
      }

      if (cmd !== 0x01) {
        socket.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        return socket.destroy();
      }

      const remote = net.connect(port, host, () => {
        socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        remote.pipe(socket);
        socket.pipe(remote);
      });

      remote.on('error', () => {
        socket.write(Buffer.from([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy();
      });

      socket.on('error', () => remote.destroy());
    });
  });

  socket.on('error', () => {});
});

server.listen(PORT, () => {
  console.log('SOCKS5 proxy running on port ' + PORT);
});
