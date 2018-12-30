const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const consola = require('consola')
require('dotenv').config()

const DB_USER = process.env.DB_USER
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_ADDRESS = process.env.DB_ADDRESS
const DB_PORT = process.env.DB_PORT
const DB_NAME = process.env.DB_NAME
const DATABASE_URL = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_ADDRESS}/${DB_NAME}?retryWrites=true`;

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

const messageSchema = new Schema({
    body: String,
    author: String,
    date: Date,
})
const Message = mongoose.model('Message', messageSchema);

function connectToDatabase() {
    mongoose.connect(DATABASE_URL, {useNewUrlParser: true});
}

wss.on('connection', function connection(ws) {
    connectToDatabase()

    ws.on('message', function incoming(messageAsJsonString) {
        const message = JSON.parse(messageAsJsonString)

        if (message.body && message.author) {
            Message.create({
                body: message.body,
                date: Date.now(),
                author: message.author,
            }, function afterSave(err, obj) {
                if (err) return handleError(err);
                wss.broadcast(obj)
            })
        } else {
            ws.send(JSON.stringify({
                body: 'Message must have body and author',
                author: 'SERVER',
                origin: 'ERROR',
                date: Date.now()
            }))
        }
    })

    ws.send(JSON.stringify({
        body: 'Message from server after connect',
        author: 'SERVER',
        origin: 'SERVER',
        date: Date.now()
    }))

    const cursor = Message.find({}).sort('-_id').limit(5).lean().cursor();
    cursor.on('data', function (message) {
        ws.send(JSON.stringify(message))
    });
});

wss.broadcast = function broadcast(message) {
   wss.clients.forEach(function each(client) {
       const { author, body, date, origin } = message

       client.send(JSON.stringify({
           author,
           body,
           date,
           origin
       }));
    });
};

router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express xD'});
});


module.exports = router;
