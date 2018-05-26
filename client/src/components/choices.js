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
    canVote: false
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
