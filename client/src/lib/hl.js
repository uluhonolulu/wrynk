
import uuidv1 from 'uuid/v1';

export default class HL {

    async getChoices(){
        const response = await this.callBlockchain('Choice');
        const choices = await response.json();
        return choices;
    }

    async getResults(){
        const response = await this.callBlockchain('VoteTotal');
        return await response.json();
    }

    async getMyVote() {
        try {
            const response = await this.callBlockchain("Ballot/github_uluhonolulu");
            const ballot = await response.json();
            const votedChoice = this.getId(ballot.votedChoice);
            // console.log(votedChoice);
            return votedChoice;

        } catch (error) {

            if (error.statusCode === 404 && error.code === "MODEL_NOT_FOUND") {
                return null;
            }

            if(error.message){
                throw(error.message);
            }
            console.log(JSON.stringify(error));
            
            throw(error);
        }
    }
    

    async voteFor(choice) {
        const uuid = uuidv1();
        const voteData = {
            $class: "org.rynk.Vote",
            uuid: uuid,
            when: new Date(),
            votedChoice: `resource:org.rynk.Choice#${choice}`
        };

        await this.callBlockchain("Vote", "post", voteData);
    }

    async callBlockchain(name, method, transactionData) {
        let requestData;
        if (method) {
            requestData = {
                method,
                headers: {
                    "content-type": "application/json",
                    Accept: "application/json"
                }
            };
            if (transactionData) {
                requestData.body = JSON.stringify(transactionData);
            }
        }

        let url = `/api/${name}?access_token=${this.access_token}`;

        return await fetch(url, requestData).then(this.handleResponse.bind(this));
    }

    async handleResponse(response) {
        if (response.ok) {
            return response;
        } else {
            let error = await this.handleInvalidResponse(response);
            // console.log(error);

            throw error; //so that we don't proceed
        }
    }

    async handleInvalidResponse(response) {
        if (response.status === 404 && false) {
            //TODO: don't confuse this with a missing model; check for error message
            return "Blockchain is not started.";
        } else if (response.status === 401) {
            //need to sign in
            return 401;
        } else {
            let contentType = response.headers.get("Content-Type");
            // let contentLength = response.headers.get("content-length");
            if (contentType && contentType.includes("json")) {
                const body = await response.json();
                //blockchain is not started
                if (this.errorIsFabricNotStarted(body.error)) {
                    return "Blockchain is not started.";
                } 
                return body.error;
            } else {
                const responseText = await response.text();
                return responseText;
            }
        }
    }

    errorIsFabricNotStarted(error) {
        return error.message.startsWith("There is no method to handle");
    }

    getId(resourceName) {
        //"resource:namespace.assetType#id" => id
        return resourceName.split("#")[1];
    }

}

