#!/usr/bin/env node

'use strict';

const args = require('yargs-parser')(process.argv.slice(2), {
    boolean: [
        'version',
        'help',
        'auto-restart',
        'path',
        'tls',
    ],
    number: [
        'port',
    ],
    string: [
        'command',
        'tls_key',
        'tls_cert',
    ],
    alias: {
        help: 'h',
        version: 'v',
    },
    default: {
        'port': process.env.PORT | 1337,
        'auto-restart': true,
        'tls': false,
        'tls_key': '',
        'tls_cert': '',
    },
});

const getMessage = (a) => a.message;

main(args);

function main(args) {
    if (args.help)
        return help();
    
    if (args.version)
        return version();
    
    if (args.path)
        return path();
    
    start({
        port: args.port,
        command: args.command,
        autoRestart: args.autoRestart,
        tls: args.tls,
        tls_key: args.tls_key,
        tls_cert: args.tls_cert,
    });
}

function path() {
    const {join} = require('path');
    console.log(join(__dirname, '..'));
}

function start(options) {
    const squad = require('squad');
    
    const {
        port,
        command,
        autoRestart,
        tls,
        tls_key,
        tls_cert,
    } = options;
    
    check(port);

    check(tls, tls_key, tls_cert);
    
    const DIR = __dirname + '/../';
    
    const gritty = require('../');
    const https = require('https');
    const fs = require( "fs");
    
    const express = require('express');
    const io = require('socket.io');
    
    const app = express();
    const server = tls ? require('https').createServer({
        key: fs.readFileSync(tls_key),
        cert: fs.readFileSync(tls_cert),
    },app) : require('http').createServer(app);

    const url = tls ? `https://localhost:${port}`: `http://localhost:${port}`;
    
    const ip = process.env.IP || /* c9 */
              '0.0.0.0';
    
    app.use(gritty())
        .use(express.static(DIR));
    
    const socket = io(server);
    
    gritty.listen(socket, {
        command,
        autoRestart,
    });
    
    server.listen(port, ip)
        .on('error', squad(exit, getMessage));
    
    console.log(`url: ${url}`);
}

function help() {
    const bin = require('../help');
    const usage = 'Usage: gritty [options]';
    
    console.log(usage);
    console.log('Options:');
    
    for (const name of Object.keys(bin)) {
        console.log('  %s %s', name, bin[name]);
    }
}

function version() {
    const pack = require('../package');
    console.log('v' + pack.version);
}

function check(port) {
    if (isNaN(port))
        exit('port should be a number 0..65535');
}

function check(tls, tls_key, tls_cert) {
    if (tls && tls_key=='')
        exit('--tls_key is required when --tls is specified');
    
    if (tls && tls_cert=='')  {
        exit('--tls_cert is required when --tls is specified');
    }
}

function exit(msg) {
    console.error(msg);
    process.exit(-1);
}

