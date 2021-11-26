const express = require('express')
const { MongoClient } = require('mongodb');
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config()
const port = process.env.PORT || 5000

// 


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkd8n.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function run() {
    try {
        await client.connect();
        const database = client.db('drones_center');
        const orderDronesCollection = database.collection('orderDrones');
        const usersCollection = database.collection('users');

        app.get('/orderDrones', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            // console.log(query);
            const cursor = orderDronesCollection.find(query);
            // console.log(cursor);
            const orderDrones = await cursor.toArray();
            res.json(orderDrones);
        });

        app.post('/orderDrones', async (req, res) => {
            const orderDrone = req.body;
            const result = await orderDronesCollection.insertOne(orderDrone);

            // console.log(result);
            res.json(result)
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        // update
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const requester = ('put', req.decodedEmail);
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'You do not have access to make admin' });
            }
        })
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Drones Center!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})