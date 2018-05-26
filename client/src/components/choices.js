import React, { Component } from 'react'
import { Button, FormGroup, Radio, Alert } from 'react-bootstrap';

export default class Choices extends Component {

  state = {
    choices: [
      {
        "$class": "org.rynk.Choice",
        "name": "Dobro"
      }
    ],
    results: [
      {
        "$class": "org.rynk.VoteTotal",
        "choiceName": "Dobro",
        "votedChoice": "resource:org.rynk.Choice#Dobro",
        "count": 1
      }
    ],
    canVote: false,
    access_token: "s5xQXaXcrJ97PWdG9OxcFlNH6bqANBuDxDpxUdEZuktYSekzSW6qpAWOX9gLkGx7"
  }


  async componentDidMount() {
    const response = await fetch(`/api/Choice?access_token=${this.state.access_token}`);
    const choices = await response.json();
    this.setState({ choices });
  }  

  async setVotePossibility() {
    try {
      
    } catch (error) {
      
    }
  }

  render() {
    const canVote = this.state.canVote;

    const cannotVoteMessage = <Alert bsStyle="warning">You are not allowed to vote</Alert>;

    const choices = this.state.choices.map((choice) => {
      return (
        <Radio key={choice.name} disabled={!canVote}>{choice.name}</Radio>
      );
    });

    return (
      <FormGroup>
        {canVote? null : (cannotVoteMessage)}
        {choices}
      </FormGroup>
    )
  }
}
