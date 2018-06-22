import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import Choices from './components/choices';

class App extends Component {
  render() {
    return (
      <div>
        <header>
          <nav className="navbar navbar-inverse navbar-static-top">
            <div className="container">
              <div className="navbar-header">
                <a className="navbar-brand" href="/" style={{fontSize:"24px"}}>rynk</a>
              </div>        
            </div>    

          </nav>

        </header>


        <div className="container">
          <div className="row">
            <Choices/>
          </div>
        </div>

      </div>
    );
  }
}

export default App;
