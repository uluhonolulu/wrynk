'use strict';
const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const FileSystemCardStore = require('composer-common').FileSystemCardStore;
const BusinessNetworkCardStore = require('composer-common').BusinessNetworkCardStore;
const connector = require('loopback-connector-composer');
const IdCard = require('composer-common').IdCard;
const LoopBackCardStore = require('../../lib/loopbackcardstore');
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
    //problem: user exists, but there's no card
    //1. use 'loaded'
    //2. check participant; if not exists we assume that the identity doesn't either
    //3. if the user doesn't exist, what happens?

    app.loopback.User.observe('loaded', async function ensureCard(ctx, next) {
        let instance = ctx.instance || ctx.data;
        if (!instance || !instance.id) {
            return next();
        }
        console.log();
        console.log("user loaded");
        let userId = instance.id;
        let userName = instance.username.replace(/\./, "_");   //github_uluhonolulu
        const adminCardName = "admin@rynk";//TODO: use the REST connection identity
        const adminConnection = new AdminConnection();
        try {
            let issuingCard = await adminConnection.exportCard(adminCardName);
            const adminBusinessNetworkConnection = new BusinessNetworkConnection();
            await adminBusinessNetworkConnection.connect(adminCardName);
            
            console.log("pinging admin using filesystem card");               
            try {
                var admin = await adminBusinessNetworkConnection.ping();
                console.log(admin);                   
            } catch (error) {
                console.error(error);                   
            }

            // Get the factory for the business network.
            let factory = adminBusinessNetworkConnection.getBusinessNetwork().getFactory();
            // Create the participants, Provide unique entries only
            let participantRegistry = await adminBusinessNetworkConnection.getParticipantRegistry('org.rynk.User');
            // let participantId = participant.getFullyQualifiedIdentifier();
            let participantExists = await participantRegistry.exists(userName);
            if (!participantExists){
                let participant = factory.newResource('org.rynk', "User", userName);
                await participantRegistry.add(participant);
                //HACK: let's just get the added participant until it's actually there
                let success = false;
                while(!success){
                    try {
                        participant = await participantRegistry.get(userName);   //make sure it's there
                        success = true;
                    } catch (error) {
                        console.error("Error getting the new participant");
                    }                        
                }

                let identity = await adminBusinessNetworkConnection.issueIdentity('org.rynk.User' + '#' + userName, userName);
                console.log("New identity");
                console.log(identity);
                
                //save the card, if it doesn't exist
                const Card = app.models.Card;//require('../../common/models/card');
                let card = await Card.findOne({ where: { userId }});
                // let identityRegistry = await adminBusinessNetworkConnection.getIdentityRegistry();
                // let identities = await identityRegistry.getAll();
                if (!card) {
                    let metadata= {
                        userName : identity.userID,
                        version : 1,
                        enrollmentSecret: identity.userSecret,
                        businessNetwork : issuingCard.getBusinessNetworkName()
                    };
                    let profileData = issuingCard.getConnectionProfile();
                    let newCard = new IdCard(metadata,profileData);

                    const cardStore = new LoopBackCardStore(Card, userId);
                    const cardName = userName + '@rynk';
                    await cardStore.put(cardName, newCard);      

                    //ping to activate
                    const userBusinessNetworkConnection = new BusinessNetworkConnection({cardStore});
                    console.log("Pinging " + cardName);               
                    try {
                        await userBusinessNetworkConnection.connect(cardName);
                        var user = await userBusinessNetworkConnection.ping();
                        console.log(user);                   
                    } catch (error) {
                        console.error(error);                   
                    } 
                }
            }
   
            
        } catch (error) {
            console.log();
            console.log("ERROR");               
            console.error(error);
            return next(error);
            // process.exit(1);
        }        
    });

    // app.loopback.User.observe('loaded', async (ctx, next) => {
        // ctx.options.username = "ulu";
        // ctx.hookState.username = "ulu";
        // console.log(JSON.stringify(ctx));
        // const composer = app.get('composer');
        // const dataSource = createDataSource(app, composer);
        // var connector = dataSource.connector;
        // if (!ctx.isNewInstance) {
        //     const Card = app.models.Card;
        //     const userId = ctx.data.id;
        //     const cardStore = new LoopBackCardStore(Card, userId);
        //     const businessNetworkConnection = new BusinessNetworkConnection({cardStore});
        //     const cardName = ctx.data.username + "@rynk";
        //     try {
        //         await businessNetworkConnection.connect(cardName);
        //         var user = await businessNetworkConnection.ping();
        //         console.log(user);                   
        //     } catch (error) {
        //         console.error(error);                   
        //     }            
        // }
    // });

    // app.get('/test', function test(req, res) {
    //     var ctx = app;
    // });

    //kinda what we do for routing
    // app.post('/api/createCard', function (req, res) {
    //     var transactionData = req.body.transactionData;
    //     var cardName = req.headers.authorization;
    //     var mynetwork = new MyNetwork(cardName);
    //     mynetwork.init().then(function () {
    //         return mynetwork.createCar(transactionData)
    //     }).then(function () {
    //         res.json({ success: true })
    //     }).catch(function (error) {
    //         res.status(500).json({error: error.toString()})    
    //     })
    // });

    // init() {
    //     var _this = this;
    //     return this.connection.connect(this.cardName).then((result) => {
    //       _this.businessNetworkDefinition = result;
    //       _this.serializer = _this.businessNetworkDefinition.getSerializer()
    //     })
    //   }

    // createCar(transactionData) {
    //     var _this = this;
    //     var resource;
    //     var transactionData;
    //     transactionData['$class'] = "org.acme.createCar";
    //     return this.connection.getTransactionRegistry("org.acme.createCar")
    //       .then(function(createProductTransactionRegistry) {
    //         serializer = _this.businessNetworkDefinition.getSerializer()
    //         resource = serializer.fromJSON(transactionData);
    //         return _this.connection.submitTransaction(resource);
    //       })
    //   }


};


function createDataSource(app, composer) {
    const connectorSettings = {
        name: 'composer',
        connector: connector,
        card: composer.card,
        cardStore: composer.cardStore,
        namespaces: composer.namespaces,
        multiuser: composer.multiuser,
        fs: composer.fs,
        wallet: composer.wallet
    };
    return app.loopback.createDataSource('composer', connectorSettings);
}
 


