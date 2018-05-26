import React, { Component } from 'react'

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
    const choices = this.state.choices.map((choice) => {
      return (
        <div>{choice.name}</div>
      );
    })
    return (
      <div>
        {choices}
      </div>
    )
  }
}
