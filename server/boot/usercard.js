'use strict';

module.exports = function(app) {
    //after save hook
    app.models.User.observe('after save', (ctx, next) => {
        console.log("after save");
        console.log(JSON.stringify(ctx));
        if (ctx.isNewInstance) {
            console.log("New user");
            //"instance":{"username":"github.uluhonolulu","email":"uluhonolulu@loopback.github.com","id":"5adafa99f8c6f228d054aa8c"}
        }
        next();
    })  
};
