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
      results: [],
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
      const canVote = await this.canIVote();
      this.setState({ canVote });

      const choices = await this.getChoices();
      this.setState({ choices }); 
      
    } catch (error) {
      //everything's handled already
    }

    
    this.setState({ isLoading: false }); 

  }  

  async updateVoteResults(){

    if (!this.state.access_token) {
      return;
    }
    
    try {
      const results = await this.getResults();
      this.setState(results);

      const choices = this.state.choices;
      choices.forEach(choice => {
        let voteResult = results.find(result => result.choiceName === choice.name);
        if (voteResult) {
          choice.count = voteResult.count
        } else {
          choice.count = 0;
        }
      });
      this.setState({ choices }); 
      
    } catch (error) {
      //never mind
    }

  }

  async canIVote() {
    try {
      const data = {
        "$class": "org.rynk.CanVote"
      };
      const response = await this.callBlockchain('CanVote', 'post', data);     
      return !!response;      //if this transaction doesn't throw, it means we can vote; 
    } catch (error) {
      return false;      
    }
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

  render() {


    if (!this.state.access_token || (this.state.error && this.state.error.message) === 401) {
      // window.location.assign("/auth/github");
      return (<Alert bsStyle="danger">Please <a href="/auth/github">sign in</a>!</Alert>);
    }
	
    if (this.state.error) {
        return (<Alert bsStyle="danger">{this.state.error.message}</Alert>);		
    }

    if (this.state.isLoading) {
      return (<Loader type="TailSpin"/>);      
    }

    const canVote = this.state.canVote;
    const cannotVoteMessage = <Alert bsStyle="success">Thank you for voting!</Alert>;
    const choices = this.state.choices.map((choice, index) => {
      return (
        <Radio key={index} disabled={!canVote} name="choices" value={choice.name}>{choice.name}: {choice.count}</Radio>
      );
    });

    let isLoading = this.state.isLoading;
    return (
      <form onSubmit={ this.onFormSubmit.bind(this) } key={this.state.key}>
        <FormGroup>
          {(canVote !== false)? null : (cannotVoteMessage)}
          {choices}
          <Button bsStyle="success" disabled={isLoading || !canVote} type="submit">    
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
    this.setState({ isLoading: true, canVote: false });
    const data = new FormData(event.target);
    let chosen = data.get('choices');
    await this.voteFor(chosen);
    this.setState({ isLoading: false });
    this.confirmVote();
  };  

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
      "votedChoice": `resource:org.rynk.Choice#${choice}`
    };

    try {
      const response = await fetch(`/api/Vote?access_token=${this.state.access_token}`, 
        {
          method: "post",  
          headers: {  
            "content-type": "application/json",
            "Accept": "application/json"  
          },  
          body: JSON.stringify(voteData)
        });
      console.log(response.status);  
      console.log(response.statusText);  
      console.log(response.type);  
      if (response.status !== 200) {
        this.handleInvalidResponse(response);
      }      
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }        
  }

  async callBlockchain(name, method, transactionData){
    let requestData;
    if (method === "post") {
      requestData = {
        method: "post",  
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
      let message = await this.handleInvalidResponse(response);
      if (this.isMessageThatUserCantVote(message)) {  //not an error, we just had to throw since we can't return "false" from chaincode
        return false;                //return the value to canIVote
      } else {
        this.setState({error: {message}});
        throw new Error(message);    //so that we don't proceed        
      }

    }
  }

  async handleInvalidResponse(response) {
    if (response.status === 404) {
      return "Blockchain is not started.";
    } else if (response.status === 401) {
      return 401;
    } else {
      let contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes('json')) {
        const error = await response.json();
        return error.error.message;     
      } else {
        const responseText = await response.text();
        return responseText;
      }     
    }
  }

  //until chaincode is able to return data, we use a throw to check if the user can vote; a certain error message means they can't (but it's not an error)
  isMessageThatUserCantVote(errMessage){
    return errMessage.toString().includes("Can't vote");
  }
  
}
