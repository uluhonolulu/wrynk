import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  render() {
    return (
      <div>
        <header>
          <nav className="navbar navbar-inverse navbar-static-top" role="navigation">
            <div className="container">
              <div className="navbar-header">
                <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
                  <span className="sr-only">Toggle navigation</span>
                  <span className="icon-bar"></span>
                  <span className="icon-bar"></span>
                  <span className="icon-bar"></span>
                </button>
                <a className="navbar-brand" href="#">rynk</a>
              </div>
              <div id="navbar" className="navbar-collapse collapse navbar-right">
                <a href="/auth/github" className="btn btn-success">Sign in</a>
              </div>
            </div>
          </nav>

        </header>


        <div className="container">
          <div className="row">

          </div>
        </div>

      </div>
    );
  }
}

export default App;
