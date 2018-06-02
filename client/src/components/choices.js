import React, { Component } from 'react'
import { Button, FormGroup, Radio, Alert } from 'react-bootstrap';
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

    this.onFormSubmit = this.onFormSubmit.bind(this);
  }


  async componentDidMount() {
    if (!this.state.access_token) {
      this.setState({ isLoading: false });
      return;
    }

    try {
      const canVote = await this.canIVote();
      this.setState({ canVote });

      const choices = await this.getChoices();
      this.setState({ choices }); 
      
      const results = await this.getResults();
      this.setState(results);

      choices.forEach(choice => {
        let voteResult = results.find(result => result.choiceName === choice.name);
        if (voteResult) {
          choice.count = voteResult.count
        } else {
          choice.count = 0;
        }
      });
    } catch (error) {
      //everything's handled already
    }

    
    this.setState({ isLoading: false }); 
  }  

  async canIVote() {
    try {
      const response = await this.callBlockchain('CanVote');     
      return true;      //if this transaction doesn't throw, it means we can vote; 
    } catch (error) {
      //TODO: check for error text
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
    const cannotVoteMessage = <Alert bsStyle="danger">You are not allowed to vote, sorry!</Alert>;
    const choices = this.state.choices.map((choice, index) => {
      return (
        <Radio key={index} disabled={!canVote} name="choices" value={choice.name}>{choice.name}: {choice.count}</Radio>
      );
    });

    let isLoading = this.state.isLoading;
    return (
      <form onSubmit={ this.onFormSubmit }>
      <FormGroup>
        {(canVote !== false)? null : (cannotVoteMessage)}
        {choices}
        <Button bsStyle="success" disabled={isLoading} type="submit">    
          {isLoading ? 'Please wait...' : 'Vote'}
        </Button>
      </FormGroup>
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
  };  

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
      this.setState({error: {message}});
      throw new Error(message);    //so that we don't proceed
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
  
}
