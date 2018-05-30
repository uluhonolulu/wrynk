import React, { Component } from 'react'
import { Button, FormGroup, Radio, Alert } from 'react-bootstrap';
import cookie from 'react-cookies';
import uuidv1 from 'uuid/v1';


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
      access_token: cookie.load('access_token')
    };

    this.onFormSubmit = this.onFormSubmit.bind(this);
  }


  async componentWillMount() {
    if (!this.state.access_token) {
      this.setState({ isLoading: false });
      return;
    }
    const canVote = await this.canIVote();
    this.setState({ canVote });
    const response = await fetch(`/api/Choice?access_token=${this.state.access_token}`);
    if(response.status === 200) {
      const choices = await response.json();
      this.setState({ choices });
    } else {
      await this.handleInvalidResponse(response); 
    }
    
    this.setState({ isLoading: false }); 
  }  

  async canIVote() {
    try {
      const response = await fetch(`/api/CanVote?access_token=${this.state.access_token}`, {method: "post"});
      console.log(response.status);  
      console.log(response.statusText);  
      console.log(response.type);       
      if (response.status === 200) {
        return true;  
      } else {
        await this.handleInvalidResponse(response);
        return false;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  render() {
    if (!this.state.access_token) {
      // window.location.assign("/auth/github");
      return (<Alert bsStyle="danger">Please <a href="/auth/github">sign in</a>!</Alert>);
    }
	
    if (this.state.error) {
        return (<Alert bsStyle="danger">{this.state.error.message}</Alert>);		
    }

    const canVote = this.state.canVote;
    const cannotVoteMessage = <Alert bsStyle="danger">You are not allowed to vote, sorry!</Alert>;
    const choices = this.state.choices.map((choice, index) => {
      return (
        <Radio key={index} disabled={!canVote} name="choices" value={choice.name}>{choice.name}</Radio>
      );
    });

    let isLoading = this.state.isLoading;
    return (
      <form onSubmit={ this.onFormSubmit }>
      <FormGroup>
        {canVote? null : (cannotVoteMessage)}
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

  async handleClick() {

  }

  async handleInvalidResponse(response) {
    if (response.status === 404) {
      this.setState({error: {message: "Blockchain is not started."}});
    } else if (response.status === 401) {
      this.setState({error: {message: "Please <a href='/auth/github'>sign in</a>!"}});
    } else {
      const error = await response.json();
      this.setState({ error: error.error });      
    }
  }
  
}
