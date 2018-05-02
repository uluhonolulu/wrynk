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
    // const fileSystemCardStore = new FileSystemCardStore();
    const businessNetworkConnection = new BusinessNetworkConnection();
    const adminConnection = new AdminConnection();
    // const businessNetworkCardStore = new BusinessNetworkCardStore();    
    //after save hook
    app.models.User.observe('after save', async (ctx, next) => {  
        console.log("after save");
        // console.log(JSON.stringify(ctx));
        // const composer = app.get('composer');
        // const dataSource = createDataSource(app, composer);
        // var connector = dataSource.connector;
        if (ctx.isNewInstance) {
            console.log("New user");

            //we need to create a new card for a user
            //1. create participant
            //2. issue her an identity
            //3. create and save a card
            //"instance":{"username":"github.uluhonolulu","email":"uluhonolulu@loopback.github.com","id":"5adafa99f8c6f228d054aa8c"}
            let userId = ctx.instance.id.toString();
            let userName = ctx.instance.username;   //github.uluhonolulu
            const adminCardName = "admin@rynk";//TODO: use the REST connection identity
            const adminConnection = new AdminConnection();
            try {
                let issuingCard = await adminConnection.exportCard(adminCardName);
                await businessNetworkConnection.connect(adminCardName);
                
                try {
                    var user = await businessNetworkConnection.ping();
                    console.log(user);                   
                } catch (error) {
                    console.error(error);                   
                }
                // try {
                //     var user = await businessNetworkConnection.ping();
                //     console.log(user);                   
                // } catch (error) {
                //     console.error(error);                   
                // }

                // Get the factory for the business network.
                let factory = businessNetworkConnection.getBusinessNetwork().getFactory();
                // Create the participants, Provide unique entries only
                let participant = factory.newResource('org.rynk', "User", userName);
                let participantRegistry = await businessNetworkConnection.getParticipantRegistry('org.rynk.User');
                await participantRegistry.add(participant);

                let identity = await businessNetworkConnection.issueIdentity('org.rynk.User' + '#' + userName, userName);
                //TODO: save the card in the DB; returning user
                let metadata= {
                    userName : identity.userID,
                    version : 1,
                    enrollmentSecret: identity.userSecret,
                    businessNetwork : issuingCard.getBusinessNetworkName()
                };
                let profileData = issuingCard.getConnectionProfile();
                let idCard = new IdCard(metadata,profileData);

                const Card = app.models.Card;//require('../../common/models/card');
                const cardStore = new LoopBackCardStore(Card, userId);
                await cardStore.put(userName + '@rynk', idCard);               
            } catch (error) {
                console.error(error);
                process.exit(1);
            }

        }
        next();
    });
    
    app.models.User.observe('loaded', async (ctx, next) => {
        console.log(JSON.stringify(ctx));
        const composer = app.get('composer');
        const dataSource = createDataSource(app, composer);
        var connector = dataSource.connector;
        if (!ctx.isNewInstance) {
            const Card = app.models.Card;
            const userId = ctx.data.id;
            const cardStore = new LoopBackCardStore(Card, userId);
            const businessNetworkConnection = new BusinessNetworkConnection({cardStore});
            const cardName = ctx.data.username + "@rynk";
            try {
                await businessNetworkConnection.connect(cardName);
                var user = await businessNetworkConnection.ping();
                console.log(user);                   
            } catch (error) {
                console.error(error);                   
            }            
        }
    });

    app.models.User.afterRemote('**', function (ctx, user, next){
        console.log(JSON.stringify(ctx));
        console.log(JSON.stringify(user));
        
    });
    app.models.UserIdentity.afterRemote('**', function (ctx, user, next){
        console.log(JSON.stringify(ctx));
        console.log(JSON.stringify(user));
        
    });


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
 


