import React, { Component } from 'react';
import './App.css';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  Container,
  Row,
  Col,
  Jumbotron,
  Button
} from 'reactstrap';

import Choices from './components/choices';

class App extends Component {
  render() {
    return (
      <div>
        <header>
          <Navbar color="dark" dark expand="md">
              <NavbarBrand href="/" style={{fontSize:"24px"}}>rynk</NavbarBrand>
          </Navbar>          
        </header>

        <Container style={{paddingTop:"24px"}}>
          <Row>
            <Choices/>    
          </Row>
        </Container>
      </div>
    );
  }
}

export default App;
