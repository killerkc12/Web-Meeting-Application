import React, { Component, useContext } from 'react'
import io from 'socket.io-client'

import {Input, Button} from '@material-ui/core'
import {BiVideo, BiVideoOff} from 'react-icons/bi'
import {MdCallEnd, MdScreenShare, MdStopScreenShare, MdPeople, MdChat} from 'react-icons/md'
import {IoMdMic, IoMdMicOff} from 'react-icons/io'
import {BiVideoRecording} from 'react-icons/bi'

import { message } from 'antd'
import 'antd/dist/antd.css'

import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.css'
import "./Video.css"
import { Col } from 'react-grid-system'
import { useStateValue } from '../ReactContextAPI/StateProvider'

const server_url = "http://localhost:4001"
// const server_url = "https://web-meeting-application.herokuapp.com/"
var connections = {}
const peerConnectionConfig = {
	'iceServers': [
		// { 'urls': 'stun:stun.services.mozilla.com' },
		{ 'urls': 'stun:stun.l.google.com:19302' },
	]
}
var socket = null
var socketId = null
var elms = 0

class Video extends Component {
	constructor(props) {
		super(props)

		this.localVideoref = React.createRef()
		const {user} = this.props.location	

		this.videoAvailable = false
		this.audioAvailable = false

		this.state = {
			video: false,
			audio: false,
			screen: false,
			chatModal: false,
			userModal: false,
			screenAvailable: false,
			messages: [],
			message: "",
			newmessages: 0,
			askForUsername: true,
			username: "",
			usernames: [],
			user : null
		}
		connections = {}

		this.getPermissions()
	}

	componentDidMount = () => {
		const {user} = this.props.location
		console.log(user)
		this.setState(user)
	}

	getPermissions = async () => {
		try{
			await navigator.mediaDevices.getUserMedia({ video: true })
				.then(() => this.videoAvailable = true)
				.catch(() => this.videoAvailable = false)

			await navigator.mediaDevices.getUserMedia({ audio: true })
				.then(() => this.audioAvailable = true)
				.catch(() => this.audioAvailable = false)

			if (navigator.mediaDevices.getDisplayMedia) {
				this.setState({ screenAvailable: true })
			} else {
				this.setState({ screenAvailable: false })
			}

			if (this.videoAvailable || this.audioAvailable) {
				navigator.mediaDevices.getUserMedia({ video: this.videoAvailable, audio: this.audioAvailable })
					.then((stream) => {
						window.localStream = stream
						this.localVideoref.current.srcObject = stream
					})
					.then((stream) => {})
					.catch((e) => console.log(e))
			}
		} catch(e) { console.log(e) }
	}

	getMedia = () => {
		this.setState({
			video: this.videoAvailable,
			audio: this.audioAvailable
		}, () => {
			this.getUserMedia()
			this.connectToSocketServer()
		})
	}

	getUserMedia = () => {
		if ((this.state.video && this.videoAvailable) || (this.state.audio && this.audioAvailable)) {
			navigator.mediaDevices.getUserMedia({ video: this.state.video, audio: this.state.audio })
				.then(this.getUserMediaSuccess)
				.then((stream) => {})
				.catch((e) => console.log(e))
		} else {
			try {
				let tracks = this.localVideoref.current.srcObject.getTracks()
				tracks.forEach(track => track.stop())
			} catch (e) {}
		}
	}

	getUserMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }

		window.localStream = stream
		this.localVideoref.current.srcObject = stream

		for (let id in connections) {
			if (id === socketId) continue

			connections[id].addStream(window.localStream)

			connections[id].createOffer().then((description) => {
				connections[id].setLocalDescription(description)
					.then(() => {
						socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
					})
					.catch(e => console.log(e))
			})
		}

		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				video: false,
				audio: false,
			}, () => {
				try {
					let tracks = this.localVideoref.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch(e) { console.log(e) }

				let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				window.localStream = blackSilence()
				this.localVideoref.current.srcObject = window.localStream

				for (let id in connections) {
					connections[id].addStream(window.localStream)

					connections[id].createOffer().then((description) => {
						connections[id].setLocalDescription(description)
							.then(() => {
								socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
							})
							.catch(e => console.log(e))
					})
				}
			})
		})
	}

	getDislayMedia = () => {
		if (this.state.screen) {
			if (navigator.mediaDevices.getDisplayMedia) {
				navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
					.then(this.getDislayMediaSuccess)
					.then((stream) => {})
					.catch((e) => console.log(e))
			}
		}
	}

	getDislayMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }

		window.localStream = stream
		this.localVideoref.current.srcObject = stream

		for (let id in connections) {
			if (id === socketId) continue

			connections[id].addStream(window.localStream)

			connections[id].createOffer().then((description) => {
				connections[id].setLocalDescription(description)
					.then(() => {
						socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
					})
					.catch(e => console.log(e))
			})
		}

		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				screen: false,
			}, () => {
				try {
					let tracks = this.localVideoref.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch(e) { console.log(e) } 

				let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				window.localStream = blackSilence()
				this.localVideoref.current.srcObject = window.localStream

				this.getUserMedia()
			})
		})
	}

	gotMessageFromServer = (fromId, message) => {
		var signal = JSON.parse(message)

		if (fromId !== socketId) {
			if (signal.sdp) {
				connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
					if (signal.sdp.type === 'offer') {
						connections[fromId].createAnswer().then((description) => {
							connections[fromId].setLocalDescription(description).then(() => {
								socket.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
							}).catch(e => console.log(e))
						}).catch(e => console.log(e))
					}
				}).catch(e => console.log(e))
			}

			if (signal.ice) {
				connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
			}
		}
	}

	changeCssVideosForMobile = (main) => {
		let widthMain = main.offsetWidth
		let minWidth = "40%"
		if ((widthMain * 30 / 100) < 300) {
			minWidth = "40%"
		}
		let minHeight = "33%"

		let height = String(100 / elms) + "%"
		let width = ""
		if(elms === 0 || elms === 1) {
			width = "100%"
			height = "100%"
		} else if (elms === 2) {
			width = "100%"
			height = "50%"
		} else if (elms === 3 || elms === 4) {
			width = "100%"
			height = "33%"
		} else {
			height = String(100 / elms) + "%"
		}

		let videos = main.querySelectorAll("video")
		for (let a = 0; a < videos.length; ++a) {
			videos[a].style.minWidth = minWidth
			videos[a].style.minHeight = minHeight
			videos[a].style.borderRadius = "10px"
			videos[a].style.backgroundColor = "#3C4043"
			videos[a].style.setProperty("width", width)
			videos[a].style.setProperty("height", height)
		}

		return {minWidth, minHeight, width, height}
	}

	changeCssVideos = (main) => {
		let widthMain = main.offsetWidth
		let minWidth = "30%"
		if ((widthMain * 30 / 100) < 300) {
			minWidth = "300px"
		}
		let minHeight = "40%"

		let height = String(100 / elms) + "%"
		let width = ""
		if(elms === 0 || elms === 1) {
			width = "100%"
			height = "100%"
		} else if (elms === 2) {
			width = "45%"
			height = "100%"
		} else if (elms === 3 || elms === 4) {
			width = "35%"
			height = "50%"
		} else {
			width = String(100 / elms) + "%"
		}

		let videos = main.querySelectorAll("video")
		for (let a = 0; a < videos.length; ++a) {
			videos[a].style.minWidth = minWidth
			videos[a].style.minHeight = minHeight
			videos[a].style.borderRadius = "10px"
			videos[a].style.backgroundColor = "#3C4043"
			videos[a].style.setProperty("width", width)
			videos[a].style.setProperty("height", height)
		}

		return {minWidth, minHeight, width, height}
	}

	connectToSocketServer = () => {
		socket = io.connect(server_url, { secure: true })

		socket.on('signal', this.gotMessageFromServer)

		socket.on('connect', () => {
			socket.emit('join-call', window.location.href, this.state.username)
			socketId = socket.id

			socket.on('chat-message', this.addMessage)

			socket.on('user-left', (id) => {
				let video = document.querySelector(`[data-socket="${id}"]`)
				if (video !== null) {
					elms--
					video.parentNode.removeChild(video)

					let main = document.getElementById('main')
					let mq = window.matchMedia("(min-width: 480px)")
					if(!mq.matches){
						console.log("mobile")
						this.changeCssVideosForMobile(main)
					}else{
						console.log("desktop")
						this.changeCssVideos(main)
					}
				}
			})

			socket.on('user-joined', (id, clients, usernames) => {
				this.setState({usernames})
				console.log("usernames : ",this.state.usernames)
				clients.forEach((socketListId) => {
					connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
					// Wait for their ice candidate       
					connections[socketListId].onicecandidate = function (event) {
						if (event.candidate != null) {
							socket.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
						}
					}

					// Wait for their video stream
					connections[socketListId].onaddstream = (event) => {
						// TODO mute button, full screen button
						var searchVidep = document.querySelector(`[data-socket="${socketListId}"]`)
						if (searchVidep !== null) { // if i don't do this check it make an empyt square
							searchVidep.srcObject = event.stream
						} else {
							elms = clients.length
							let main = document.getElementById('main')
							let cssMesure 
							// let cssMesure = this.changeCssVideos(main)
							let mq = window.matchMedia("(min-width: 480px)")
							if(!mq.matches){
								console.log("mobile1")	
								cssMesure = this.changeCssVideosForMobile(main)
							}else{
								console.log("desktop1")
								cssMesure = this.changeCssVideos(main)
							}

							

							let video = document.createElement('video')

							let css = {minWidth: cssMesure.minWidth, minHeight: cssMesure.minHeight, maxHeight: "100%", margin: "10px",
								 borderRadius: "10px", backgroundColor :"#3C4043" , objectFit: "fill"}
							for(let i in css) video.style[i] = css[i]

							video.style.setProperty("width", cssMesure.width)
							video.style.setProperty("height", cssMesure.height)
							video.setAttribute('data-socket', socketListId)
							video.srcObject = event.stream
							video.autoplay = true
							video.playsinline = true

							main.appendChild(video)
						}
					}

					// Add the local video stream
					if (window.localStream !== undefined && window.localStream !== null) {
						connections[socketListId].addStream(window.localStream)
					} else {
						let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
						window.localStream = blackSilence()
						connections[socketListId].addStream(window.localStream)
					}
				})

				if (id === socketId) {
					for (let id2 in connections) {
						if (id2 === socketId) continue
						
						try {
							connections[id2].addStream(window.localStream)
						} catch(e) {}
			
						connections[id2].createOffer().then((description) => {
							connections[id2].setLocalDescription(description)
								.then(() => {
									socket.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
								})
								.catch(e => console.log(e))
						})
					}
				}
			})
		})
	}

	silence = () => {
		let ctx = new AudioContext()
		let oscillator = ctx.createOscillator()
		let dst = oscillator.connect(ctx.createMediaStreamDestination())
		oscillator.start()
		ctx.resume()
		return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
	}
	black = ({ width = 640, height = 480 } = {}) => {
		let canvas = Object.assign(document.createElement("canvas"), { width, height })
		canvas.getContext('2d').fillRect(0, 0, width, height)
		let stream = canvas.captureStream()
		return Object.assign(stream.getVideoTracks()[0], { enabled: false })
	}

	handleVideo = () => this.setState({ video: !this.state.video }, () => this.getUserMedia())
	handleAudio = () => this.setState({ audio: !this.state.audio }, () => this.getUserMedia())
	handleScreen = () => this.setState({ screen: !this.state.screen }, () => this.getDislayMedia())

	handleEndCall = () => {
		try {
			let tracks = this.localVideoref.current.srcObject.getTracks()
			tracks.forEach(track => track.stop())
		} catch (e) {}
		window.location.href = "/"
	}

	openChat = () => this.setState({ chatModal: true, newmessages: 0 })
	closeChat = () => this.setState({ chatModal: false })
	handleMessage = (e) => this.setState({ message: e.target.value })

	openUser = () => this.setState({ userModal: true})
	closeUser = () => this.setState({ userModal: false})

	addMessage = (data, sender, socketIdSender) => {
		this.setState(prevState => ({
			messages: [...prevState.messages, { "sender": sender, "data": data }],
		}))
		if (socketIdSender !== socketId) {
			this.setState({ newmessages: this.state.newmessages + 1 })
		}
	}

	handleUsername = (e) => {
		console.log(this.state.username," username updated")
		this.setState({ username: e.target.value })
	}

	sendMessage = () => {
		socket.emit('chat-message', this.state.message, this.state.username)
		this.setState({ message: "", sender: this.state.username })
	}

	copyUrl = () => {
		let text = window.location.href
		if (!navigator.clipboard) {
			let textArea = document.createElement("textarea")
			textArea.value = text
			document.body.appendChild(textArea)
			textArea.focus()
			textArea.select()
			try {
				document.execCommand('copy')
				message.success("Link copied to clipboard!")
			} catch (err) {
				message.error("Failed to copy")
			}
			document.body.removeChild(textArea)
			return
		}
		navigator.clipboard.writeText(text).then(function () {
			message.success("Link copied to clipboard!")
		}, () => {
			message.error("Failed to copy")
		})
	}

	connect = () =>{
		console.log(this.username," username is here")
		if(this.state.username === null || this.state.username === undefined || this.state.username === ""){
			const mandatory = document.getElementById('mandatory')
			mandatory.style.display = "block"
			// alert("Username is Mandatory!")
		}
		else
			this.setState({ askForUsername: false }, () => this.getMedia())
	} 

	isChrome = function () {
		let userAgent = (navigator && (navigator.userAgent || '')).toLowerCase()
		let vendor = (navigator && (navigator.vendor || '')).toLowerCase()
		let matchChrome = /google inc/.test(vendor) ? userAgent.match(/(?:chrome|crios)\/(\d+)/) : null
		// let matchFirefox = userAgent.match(/(?:firefox|fxios)\/(\d+)/)
		// return matchChrome !== null || matchFirefox !== null
		return matchChrome !== null
	}

	render() {
		if(this.isChrome() === null){
			return (
				<div style={{background: "white", width: "30%", height: "auto", padding: "20px", minWidth: "400px",
						textAlign: "center", margin: "auto", marginTop: "50px", justifyContent: "center"}}>
					<h1>Sorry, this works only with Google Chrome</h1>
				</div>
			)
		}
		return (
			<div>
				{this.state.askForUsername === true ?
					<Row className="screen">
						<Col>
						<div className="my-video">
						<video style={{borderRadius:"10px",backgroundColor:"#3C4043"}} width="100%" height="100%"  id="my-video" ref={this.localVideoref} autoPlay muted>
							</video>
							{/* <div style={{position:"absolute", display:"flex", marginLeft:"40%", bottom:"20px"}}>
										{
											this.state.audio ?
												<div className="screen_mic"  onClick={this.handleAudio} >
												<IoMdMic className="screen_mic_icon"/> 
												</div>
											:
												<div className="screen_mic_red"  onClick={this.handleAudio} >
												<IoMdMicOff className="screen_mic_icon"/>
												</div>
										}
										{
											this.state.video ?
												<div className="screen_video"  onClick={this.handleVideo}>
												<BiVideo className="screen_video_icon"/>
												</div>
											:
												<div className="screen_video_red"  onClick={this.handleVideo}>
												<BiVideoOff className="screen_video_icon"/>
												</div>
										}
							</div> */}
						</div>
							
						</Col>
						<Col>
							<div class="ready-to-join" style={{textAlign:"center", marginTop:"200px"}}>
								<h3>Ready to Join</h3>
								<p id="mandatory" style={{color:"red",display:"none"}}>Username is Mandatory!</p>
								<Input style={{color:"whitesmoke",borderColor:"whitesmoke"}}
								 value={this.state.username}
								 required placeholder="Username" onChange={e => this.handleUsername(e)} />
								<Button variant="contained" className="join_button" onClick={this.connect} style={{ 
									margin: "20px",backgroundColor:"#1B73E8", color:"whitesmoke", height:"50px", width:"200px", fontSize:"20px",
									borderRadius:"20px",fontWeight:"bold" }}>Join Meeting</Button>
							</div>
						</Col>
					</Row>
					:
					<div>
						<div className="meetFooter">
							<Row>
								<Col md={5}>
									<div style={{display:"flex",marginLeft:"30px",cursor:"pointer"}}>
										<h3 style={{ backgroundColor:"black",borderRadius:"10px"}} onClick={this.copyUrl}>{window.location.href}</h3>
									</div>
								</Col>
								<Col md={3}>
									<div className="icons_center">
										{
											this.state.audio ?
												<div className="mic"  onClick={this.handleAudio} >
												<IoMdMic className="mic_icon"/> 
												</div>
											:
												<div className="mic_red"  onClick={this.handleAudio} >
												<IoMdMicOff className="mic_icon"/>
												</div>
										}
										{
											this.state.video ?
												<div className="video"  onClick={this.handleVideo}>
												<BiVideo className="video_icon"/>
												</div>
											:
												<div className="video_red"  onClick={this.handleVideo}>
												<BiVideoOff className="video_icon"/>
												</div>
										}
										{
											this.state.screen ?
												<div className="screen_share_red"  onClick={this.handleScreen}>
												<MdStopScreenShare className="screen_share_icon" />
												</div>
											:
												<div className="screen_share"  onClick={this.handleScreen}>
												<MdScreenShare className="screen_share_icon" />
												</div>
										}
										<div className="end" onClick={this.handleEndCall}>
											<MdCallEnd className="end_icon" />
											</div>
									</div>
								</Col>
								<Col mc={3}>
								<div className="icons_right">
									<div className="recording">
										<BiVideoRecording/>
									</div>
									<div className="people" onClick={this.openUser} >
										<MdPeople/><sup>{this.state.usernames.length}</sup>
									</div>
									<div className="chat" onClick={this.openChat}>
										<MdChat/>
									</div>
								</div>
								</Col>
							</Row>
						</div>
						{/* //modal for chat */}
						<Modal show={this.state.chatModal} onHide={this.closeChat} style={{ zIndex: "999999" }}>
							<Modal.Header closeButton>
								<Modal.Title>Chat Room</Modal.Title>
							</Modal.Header>
							<Modal.Body style={{ overflow: "auto", overflowY: "auto", height: "400px", textAlign: "left" }} >
								{this.state.messages.length > 0 ? this.state.messages.map((item, index) => (
									<div key={index} style={{textAlign: "left"}}>
										<p style={{ wordBreak: "break-all" }}><b>{item.sender}</b>: {item.data}</p>
									</div>
								)) : <p>No message yet</p>}
							</Modal.Body>
							<Modal.Footer className="div-send-msg">
								<Input placeholder="Message" value={this.state.message} onChange={e => this.handleMessage(e)} />
								<Button variant="contained" color="primary" onClick={this.sendMessage}>Send</Button>
							</Modal.Footer>
						</Modal>
						{/* //modal for list of participants */}
						<Modal show={this.state.userModal} onHide={this.closeUser} style={{ zIndex: "999999" }}>
							<Modal.Header closeButton>
								<Modal.Title>People List</Modal.Title>
							</Modal.Header>
							<Modal.Body style={{ overflow: "auto", overflowY: "auto", height: "400px", textAlign: "left" }} >
								{this.state.usernames.length > 0 ? this.state.usernames.map((item, index) => (
									<div key={index} style={{textAlign: "left"}}>
										<p style={{ wordBreak: "break-all" }}>{index+1} : <b>{item}</b></p><hr></hr>
									</div>
								)) : <p></p>}
							</Modal.Body>
						</Modal>


						<div className="container">
							<Row id="main" className="flex-container" style={{ margin: "", padding: "20px" }}>
								<video id="my-video" ref={this.localVideoref} autoPlay muted style={{ borderRadius:"10px", backgroundColor:"#3C4043",
									margin: "10px",objectFit: "fill",
									width: "100%",height: "100%"}}></video>
							</Row>
						</div>
					</div>
				}
			</div>
		)
	}
}

export default Video