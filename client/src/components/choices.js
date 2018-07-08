//exception policy:
//setState({error: <string>}) called from componentDidMount and such
//methods inside componentDidMount are state agnostic; they throw string-typed errors

import React, { Component } from 'react'
import { Row, Col, FormGroup, Label, Input, Alert, Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import cookie from 'react-cookies';
import Loader from 'react-loader-spinner';

import HL from '../lib/hl';


export default class Choices extends Component {
  constructor(props, context) {
    super(props, context);
    this.hl = new HL();

    // this.handleClick = this.handleClick.bind(this);

    this.state = {
      choices: [],
      isLoading: true,
      access_token: cookie.load('access_token')
    };
    this.hl.access_token = this.state.access_token;

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
      const choices = await this.hl.getChoices();
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
    const results = await this.hl.getResults();

    const votedChoice = await this.hl.getMyVote();

    const choices = this.state.choices;
    choices.forEach(choice => {
      //vote count
      let voteResult = results.find(result => result.choiceName === choice.name);
      if (voteResult) {
        Object.assign(choice, voteResult);
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

  render() {


    if (!this.state.access_token || this.state.error === 401) {
      // window.location.assign("/auth/github");
      return (<Alert color="danger">Please <a href="/auth/github">sign in</a>!</Alert>);
    }
	
    if (this.state.error) {
        return (<Alert color="danger">{this.state.error}</Alert>);		
    }

    if (this.state.isLoading) {
      return (<Loader type="TailSpin"/>);      
    }


    //const cannotVoteMessage = <Alert color="success">Thank you for voting!</Alert>;
    const choices = this.state.choices.map((choice, index) => {
      return (
        <Col key={index}>
          <FormGroup check>
            <Label check>
              <Input type="radio" name="choices" value={choice.name} checked={choice.selected} onChange={ this.handleVoteChange.bind(this) } />{' '}
              {choice.name}: {choice.count} <br/> <img src={choice.URL} style={{height: "300px"}}/>
            </Label>
          </FormGroup>
        </Col>
      );
    });

    let isLoading = this.state.isLoading;
    return (
      
        <form onSubmit={ this.onFormSubmit.bind(this) } key={this.state.key}>
          <FormGroup>
            <Row>{choices}</Row>
            <Button color="success" disabled={isLoading} type="submit">    
              {isLoading ? 'Please wait...' : 'Vote'}
            </Button>
          </FormGroup>

          <Modal isOpen={this.state.showConfirmation}>
            <ModalHeader>
              Thank you for voting!
            </ModalHeader>
            <ModalBody>
              <p>Your vote will be counted in a few minutes.</p>           
            </ModalBody>
            <ModalFooter>
              <Button color="success" onClick={this.closeConfirmationDialog.bind(this)}>Close</Button>
            </ModalFooter>
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
      await this.hl.voteFor(chosen);      
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

}
