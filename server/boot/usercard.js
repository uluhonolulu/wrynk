'use strict';
const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const FileSystemCardStore = require('composer-common').FileSystemCardStore;
const BusinessNetworkCardStore = require('composer-common').BusinessNetworkCardStore;
const connector = require('loopback-connector-composer');
const IdCard = require('composer-common').IdCard;

module.exports = function(app) {
    // const fileSystemCardStore = new FileSystemCardStore();
    const businessNetworkConnection = new BusinessNetworkConnection();
    const adminConnection = new AdminConnection();
    // const businessNetworkCardStore = new BusinessNetworkCardStore();    
    //after save hook
    app.models.User.observe('after save', async (ctx, next) => {  //TODO: change to "after save"
        console.log("after save");
        // console.log(JSON.stringify(ctx));
        const composer = app.get('composer');
        const dataSource = createDataSource(app, composer);
        var connector = dataSource.connector;
        if (ctx.isNewInstance) {
            console.log("New user");

            //we need to create a new card for a user
            //1. create participant
            //2. issue her an identity
            //3. create and save a card
            //"instance":{"username":"github.uluhonolulu","email":"uluhonolulu@loopback.github.com","id":"5adafa99f8c6f228d054aa8c"}

            await businessNetworkConnection.connect("admin@rynk");//TODO: use the REST connection identity
            try {
                var user = await businessNetworkConnection.ping();
                console.log(user);
                
            } catch (error) {
                console.error(error);
                
            }
            // Get the factory for the business network.
            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();
            // Create the participants, Provide unique entries only
            let participant = factory.newResource('org.rynk', "User", "github.uluhonolulu");
            let participantRegistry = await businessNetworkConnection.getParticipantRegistry('org.rynk.User');
            await participantRegistry.add(participant);
            return await businessNetworkConnection.issueIdentity('org.rynk.User' + '#' + "github.uluhonolulu", "github.uluhonolulu");
            // let data = {
            //     "$class": "org.rynk.User",
            //     "userName": "8867"
            // };
            // // let options = {
            // //     accessToken: '123',
            // //     card: "admin@rynk",
            // //     cardStore: 
            // // }
            // let options = null;
            // connector.create('org.rynk.User', data, options, () => next());
        }
        next();
    })  
};


    // Define and register the method.
    let issueIdentity = (data, res, options) => {
        let cardData;
        return new Promise((resolve, reject) => {
            connector.issueIdentity(data.participant, data.userID, data.options, options, (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        }).then((cardData_) => {
            cardData = cardData_;
            return IdCard.fromArchive(cardData);
        })
        .then((card) => {
            const name = card.getUserName() + '@' + card.getBusinessNetworkName();
            res.setHeader('Content-Disposition', `attachment; filename=${name}.card`);
            res.setHeader('Content-Length', cardData.length);
            res.setHeader('Content-Type', 'application/octet-stream');
            return cardData;
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
        