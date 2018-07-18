
import uuidv1 from 'uuid/v1';

export default class HL {

    async getChoices(){
        try {
            const response = await this.callBlockchain('Choice');
            const choices = await response.json();
            return choices;
            
        } catch (error) {
            if (typeof error === "string") {
                throw error;
            }
            throw error.message || JSON.stringify(error);
        }
    }

    async getResults(){
        const response = await this.callBlockchain('VoteTotal');
        return await response.json();
    }

    async getMyVote() {
        try {
            let response = await this.callBlockchain("Ballot/github_uluhonolulu", "head");    //check if we have a vote
            if (response.status === 404) {
                return null;
            }

            //now let's get the vote result
            response = await this.callBlockchain("Ballot/github_uluhonolulu");
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
            if (!error) {
                return response;    //not an error
            }

            throw error; //so that we don't proceed
        }
    }

    async handleInvalidResponse(response) {
        if (response.status === 404 && false) {
            //TODO: don't confuse this with a missing model; check for error message
            return "Blockchain is not started.";
        } else if (response.status === 401) {
            //need to sign in
            const responseText = await response.text();
            debugger;
            return 401;
        } else {
            const responseText = await response.text();
            //if the text is empty, we don't have an error (like, we just checked for ballot existence)
            if (!responseText) {
                return null;
            }

            let contentType = response.headers.get("Content-Type");
            if (contentType && contentType.includes("json")) {
                const body = JSON.parse(responseText);
                //blockchain is not started
                if (this.errorIsFabricNotStarted(body.error)) {
                    return "Blockchain is not started.";
                } 
                return body.error;
            } else {
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

