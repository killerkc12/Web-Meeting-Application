import React, { Component } from 'react'
import Video from './Components/Video/Video'
import Home from './Components/Home/Home'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import './App.css'

class App extends Component {
	render() {
		return (
			<div className="app">
				<Router>
					<Switch>
						<Route path="/" exact component={Home} />
						<Route path="/:url" component={Video} />
					</Switch>
				</Router>
			</div>
		)
	}
}

export default App;