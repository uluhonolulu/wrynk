//exception policy:
//setState({error: <string>}) called from componentDidMount and such
//methods inside componentDidMount are state agnostic; they throw string-typed errors

import React, { Component } from 'react'
import { Button, FormGroup, Radio, Alert, Modal } from 'react-bootstrap';
import cookie from 'react-cookies';
import uuidv1 from 'uuid/v1';
import Loader from 'react-loader-spinner';


export default class Choices extends Component {
  constructor(props, context) {
    super(props, context);

    // this.handleClick = this.handleClick.bind(this);

    this.state = {
      choices: [],
      isLoading: true,
      access_token: cookie.load('access_token')
    };

    //refresh the state every 3s to get the current votes
    setInterval(() => { this.updateVoteResults(); }, 3000);
  }


  async componentDidMount() {
    console.log("componentDidMount");
    
    if (!this.state.access_token) {
      this.setState({ isLoading: false });
      return;
    }

    try {
      const choices = await this.getChoices();
      this.setState({ choices }); 

      await this.updateVoteResults();
      
    } catch (error) {   //error should be a string
      console.error(error);   
      //error = JSON.stringify(error);  //just in case
      this.setState({ error });
    }

    
    this.setState({ isLoading: false }); 

  }  

  async updateVoteResults(){

    if (!this.state.access_token) {
      return;
    }
    const results = await this.getResults();

    const votedChoice = await this.getMyVote();

    const choices = this.state.choices;
    choices.forEach(choice => {
      //vote count
      let voteResult = results.find(result => result.choiceName === choice.name);
      if (voteResult) {
        choice.count = voteResult.count
      } else {
        choice.count = 0;
      }

      //my vote
      //if we changed the vote manually, don't display the loaded value
      if (!this.state.voteChanged) {
        choice.selected = (choice.name === votedChoice);      
      }

    });


    this.setState({ choices }); 

  }

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

  render() {


    if (!this.state.access_token || this.state.error === 401) {
      // window.location.assign("/auth/github");
      return (<Alert bsStyle="danger">Please <a href="/auth/github">sign in</a>!</Alert>);
    }
	
    if (this.state.error) {
        return (<Alert bsStyle="danger">{this.state.error}</Alert>);		
    }

    if (this.state.isLoading) {
      return (<Loader type="TailSpin"/>);      
    }


    //const cannotVoteMessage = <Alert bsStyle="success">Thank you for voting!</Alert>;
    const choices = this.state.choices.map((choice, index) => {
      return (
        <Radio key={index} name="choices" value={choice.name} checked={choice.selected} onChange={ this.handleVoteChange.bind(this) }>{choice.name}: {choice.count}</Radio>
      );
    });

    let isLoading = this.state.isLoading;
    return (
      <form onSubmit={ this.onFormSubmit.bind(this) } key={this.state.key}>
        <FormGroup>
          {choices}
          <Button bsStyle="success" disabled={isLoading} type="submit">    
            {isLoading ? 'Please wait...' : 'Vote'}
          </Button>
        </FormGroup>

        <Modal show={this.state.showConfirmation} onHide={this.handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Thank you for voting!</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Your vote will be counted in a few minutes.</p>           
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="success" onClick={this.closeConfirmationDialog.bind(this)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </form>
    )
  }



  async onFormSubmit(event) {
    event.preventDefault();
    this.setState({ isLoading: true });
    const data = new FormData(event.target);
    let chosen = data.get('choices');
    try {
      await this.voteFor(chosen);      
      this.setState({ isLoading: false });
      this.confirmVote();
    } catch (error) {
      //console.error(error);
      let message = error.message;
      if (error.name) {
        message = `${error.name}: ${message}`;
      }
      this.setState({error: message});
      this.setState({ isLoading: false });
    } 
  
  };  

  handleVoteChange(event) {
    this.setState({voteChanged: true}); //to prevent changing back to the loaded vote

    //get the selected value
    var formElement = event.target.closest('form'); //document.querySelector("form")
    const data = new FormData(formElement);
    let chosen = data.get('choices');
    
    //now let's change the state to reflect the new situation
    const choices = this.state.choices;
    choices.forEach(choice => {
      choice.selected = (choice.name === chosen);    
    });  
    
    //update the state
    this.setState({choices});
  }

  confirmVote() {
    this.setState({ showConfirmation: true });
  }

  closeConfirmationDialog() {
    this.setState({ showConfirmation: false });
  }

  async voteFor(choice){
    const uuid = uuidv1();
    const voteData = {
      "$class": "org.rynk.Vote",
      "uuid": uuid,
      "when": new Date(),
      "votedChoice": `resource:org.rynk.Choice#${choice}`
    };

    await this.callBlockchain("Vote", "post", voteData);     
  }

  async callBlockchain(name, method, transactionData){
    let requestData;
    if (method) {
      requestData = {
        method,  
        headers: {  
          "content-type": "application/json",
          "Accept": "application/json"  
        }
      };
      if (transactionData) {
        requestData.body = JSON.stringify(transactionData);
      }
    }

    let url = `/api/${name}?access_token=${this.state.access_token}`;

    return await fetch(url, requestData).then(this.handleResponse.bind(this)); 
  }

  async handleResponse(response){
    if (response.ok) {
      return response;
    } else {
      let error = await this.handleInvalidResponse(response);
      // console.log(error);
      
      throw error;    //so that we don't proceed        
    }
  }

  async handleInvalidResponse(response) {
    if (response.status === 404 && false) {  //TODO: don't confuse this with a missing model; check for error message
      return "Blockchain is not started.";
    } else if (response.status === 401) {   //need to sign in
      return 401;
    } else {
      let contentType = response.headers.get("Content-Type");
      // let contentLength = response.headers.get("content-length");
      if (contentType && contentType.includes('json')) {
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

  errorIsFabricNotStarted(error){
    return error.message.startsWith("There is no method to handle");
  }

  getId(resourceName){    //"resource:namespace.assetType#id" => id
    return resourceName.split("#")[1];
  }


}
