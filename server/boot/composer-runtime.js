/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const LoopBackCardStore = require('../../lib/loopbackcardstore');

module.exports = function (app) {

    // Get the Composer configuration.
    const composer = app.get('composer');
    if (!composer) {
        return;
    }

    // We only need to enable this code if the multiple user option has been specified.
    const multiuser = !!composer.multiuser;
    if (!multiuser) {
        return;
    }

    // Extract the required models from the LoopBack application.
    const Card = app.models.Card;

    // Register a hook for all remote methods that loads the enrollment ID and
    // enrollment secret from the logged-in users wallet for passing to the connector.
    app.remotes().phases
        .addBefore('invoke', 'options-from-request')
        .use(function (ctx, next) {

            // Check to see if the access token has been provided.
            if (!ctx.args.options) {
                return next();
            } else if (!ctx.args.options.accessToken) {
                return next();
            }

            // Extract the current user ID.
            const userId = ctx.args.options.accessToken.userId;
            if (!userId) {
                ctx.res.send(401);
                //return next(new Error(401));
                return next();
            }

            // Find the default card for this user.
            //TODO: FindOrCreate, and we won't have to use a hook
            //We need: userId, username
            var self = app;
            return Card.findOne({ where: { userId }})   
                .then((lbCard) => {

                    // Store the card for the LoopBack connector to use.
                    if (lbCard) {
                        ctx.args.options.cardStore = new LoopBackCardStore(Card, userId);
                        ctx.args.options.card = lbCard.name;
                    } else {
                        ctx.res.send(401);
                        throw new Error(401);
                    }

                })
                .then(() => {
                    next();
                })
                .catch((error) => {
                    next(error);
                });

        });

    // app.remotes().phases
    //     .addAfter('invoke', 'ensure-card')
    //     .use(function ensureCard(ctx, next){
    //         var self = app;
    //     });
    // app.remotes().phases
    //     .addAfter('auth', 'ensure-card')
    //     .use(function ensureCard(ctx, next){
    //         var self = app;
    //     });

};

