import React, { Component } from 'react'
import { Button, FormGroup, Radio, Alert } from 'react-bootstrap';


export default class Choices extends Component {
  constructor(props, context) {
    super(props, context);

    this.handleClick = this.handleClick.bind(this);

    this.state = {
      choices: [],
      results: [
        {
          "$class": "org.rynk.VoteTotal",
          "choiceName": "Dobro",
          "votedChoice": "resource:org.rynk.Choice#Dobro",
          "count": 1
        }
      ],
      canVote: false,
      isLoading: true,
      access_token: "s5xQXaXcrJ97PWdG9OxcFlNH6bqANBuDxDpxUdEZuktYSekzSW6qpAWOX9gLkGx7"
    };
  }


  async componentDidMount() {
    const canVote = await this.canIVote();
    this.setState({ canVote });
    const response = await fetch(`/api/Choice?access_token=${this.state.access_token}`);
    const choices = await response.json();
    this.setState({ choices });
    this.setState({ isLoading: false });
  }  

  async canIVote() {
    try {
      const response = await fetch(`/api/CanVote?access_token=${this.state.access_token}`, {method: "post"});
      console.log(response.status);  
      console.log(response.statusText);  
      console.log(response.type);        
      return response.status === 200;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  render() {
    const canVote = this.state.canVote;
    const cannotVoteMessage = <Alert bsStyle="danger">You are not allowed to vote, sorry!</Alert>;
    const choices = this.state.choices.map((choice, index) => {
      return (
        <Radio key={index} disabled={!canVote}>{choice.name}</Radio>
      );
    });

    let isLoading = this.state.isLoading;
    return (
      <FormGroup>
        {canVote? null : (cannotVoteMessage)}
        {choices}
        <Button bsStyle="success" disabled={isLoading} onClick={!isLoading ? this.handleClick : null}>    
          {isLoading ? 'Please wait...' : 'Vote'}
        </Button>
      </FormGroup>
    )
  }

  async handleClick() {
    this.setState({ isLoading: true, canVote: false });

    const voteData = {
      "$class": "org.rynk.Vote",
      "uuid": "xyzt",
      "votedChoice": "resource:org.rynk.Choice#Dobro"
    }
    try {
      const response = await fetch(`/api/Vote?access_token=${this.state.access_token}`, 
        {
          method: "post",  
          headers: {  
            "content-type": "application/json",
            "Accept": "application/json"  
          },  
          body: voteData
        });
      console.log(response.status);  
      console.log(response.statusText);  
      console.log(response.type);        
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }    
  }
  
}
