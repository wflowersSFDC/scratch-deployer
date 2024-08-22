const cluster = require('cluster');
const os = require('os');
const express = require('express');
const routes = require('./routes');
require('dotenv').config();

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        // Replace the dead worker
        cluster.fork();
    });
} else {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(express.json());
    app.use('/', routes);

    app.listen(port, () => {
        console.log(`Worker ${process.pid} running on port ${port}`);
    });
}
