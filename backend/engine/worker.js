const { Worker } = require('bullmq');
const processor = require('./processor');
const Redis = require('ioredis');
const { Emitter } = require('@socket.io/redis-emitter');

const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

// For broadcasting from worker to all API nodes using the official emitter
const redisClient = new Redis(redisOptions);
const io = new Emitter(redisClient);

const worker = new Worker('signal-processing', async (job) => {
    if (job.name === 'processSignal') {
        const signal = job.data;
        console.log(`[WORKER] Processing job ${job.id} for signal ${signal.id}`);

        // Pass the actual emitter to the processor
        await processor.processSignal(signal, io);
    }
}, { connection: redisOptions });

worker.on('completed', (job) => {
    console.log(`[WORKER] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`[WORKER] Job ${job.id} failed: ${err.message}`);
});

console.log('Signal Worker started...');
