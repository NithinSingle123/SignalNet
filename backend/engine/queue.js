const { Queue } = require('bullmq');

const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

const signalQueue = new Queue('signal-processing', {
    connection: redisOptions
});

module.exports = signalQueue;
