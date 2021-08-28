import React, { Component } from 'react'
import Video from './Components/Video/Video'
import Home from './Components/Home/Home'
import Screen from './Components/Middleware/Screen'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import './App.css'

class App extends Component {
	render() {
		return (
			<div className="app">
				<Router>
					<Switch>
						<Route path="/" exact component={Home} />
						<Route path="/:url/false" exact component={Screen}  />
						<Route path="/:url" exact component={Video}  />
					</Switch>
				</Router>
			</div>
		)
	}
}

export default App;