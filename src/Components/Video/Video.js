import React, { Component, useContext, useRef } from 'react'
import io from 'socket.io-client'

import {Input, Button} from '@material-ui/core'
import {BiVideo, BiVideoOff} from 'react-icons/bi'
import {MdCallEnd, MdScreenShare, MdStopScreenShare, MdPeople, MdChat, MdFiberManualRecord} from 'react-icons/md'
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
import { useReactMediaRecorder } from 'react-media-recorder'
import { useState } from 'react'
import { useEffect } from 'react'

// const server_url = "http://localhost:4001"
const server_url = "https://web-meeting-application.herokuapp.com/"
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

const Video = () => {

	const localVideoref = useRef()
	var videoAvailable = false
	var audioAvailable = false

	const [video, setVideo] = useState(false)
	const [audio, setAudio] = useState(false)
	const [screen, setScreen] = useState(false)
	const [chatModal, setChatModal] = useState(false)
	const [userModal, setUserModal] = useState(false)
	const [screenAvailable, setScreenAvailable] = useState(false)
	const [messages, setMessages] = useState([])
	const [message, setMessage] = useState("")
	const [newmessages, setNewmessages] = useState(0)
	const [askForUsername, setAskForUsername] = useState(true)
	const [username, setUsername] = useState("")
	const [usernames, setUsernames] = useState([])
	const [user, serUser] = useState(null)
	const [joinStatus, setJoinStatus] = useState(false)

	const [screenRec, setScreenRec] = useState(true)
	const [audioRec, setAudioRec] = useState(false)
	const [videoRec, setVideoRec] = useState(false)
	const downloadRecordingPath = "Screen_Recording_Demo"
	const downloadRecordingType = "mp4"
	const emailToSupport = "support@xyz.com"
	const recordingStatus = null

	connections = {}

	useEffect(()=> {
		getPermissions()
	})
	
	const getPermissions = async () => {
		try{
			await navigator.mediaDevices.getUserMedia({ video: true })
				.then(() => videoAvailable = true)
				.catch(() => videoAvailable = false)

			await navigator.mediaDevices.getUserMedia({ audio: true })
				.then(() => audioAvailable = true)
				.catch(() => audioAvailable = false)

			if (navigator.mediaDevices.getDisplayMedia) {
				setScreenAvailable(true)
			} else {
				setScreenAvailable(false)
			}

			if (videoAvailable || audioAvailable) {
				navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable })
					.then((stream) => {
						window.localStream = stream
						localVideoref.current.srcObject = stream
					})
					.then((stream) => {})
					.catch((e) => console.log(e))
			}
		} catch(e) { console.log(e) }
	}

	const getMedia = () => {
			setVideo(videoAvailable)
			setAudio(audioAvailable)
			getUserMedia()
			connectToSocketServer()
	}

	const getUserMedia = () => {
		if ((video && videoAvailable) || (audio && audioAvailable)) {
			navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
				.then(getUserMediaSuccess)
				.then((stream) => {})
				.catch((e) => console.log(e))
		} else {
			try {
				let tracks = localVideoref.current.srcObject.getTracks()
				tracks.forEach(track => track.stop())
			} catch (e) {}
		}
	}

	const getUserMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }

		window.localStream = stream
		localVideoref.current.srcObject = stream

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
			setVideo(false)
			setAudio(false)
				try {
					let tracks = localVideoref.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch(e) { console.log(e) }

				let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				window.localStream = blackSilence()
				localVideoref.current.srcObject = window.localStream

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
	}

	const getDislayMedia = () => {
		if (screen) {
			if (navigator.mediaDevices.getDisplayMedia) {
				navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
					.then(getDislayMediaSuccess)
					.then((stream) => {})
					.catch((e) => console.log(e))
			}
		}
	}

	const getDislayMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }

		window.localStream = stream
		localVideoref.current.srcObject = stream

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
			setScreen(false)
			
				try {
					let tracks = localVideoref.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch(e) { console.log(e) } 

				let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				window.localStream = blackSilence()
				localVideoref.current.srcObject = window.localStream

				getUserMedia()
			})
	}

	const gotMessageFromServer = (fromId, message) => {
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

	const changeCssVideosForMobile = (main) => {
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

	const changeCssVideos = (main) => {
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

	const connectToSocketServer = () => {
		socket = io.connect(server_url, { secure: true })

		socket.on('signal', gotMessageFromServer)

		socket.on('connect', () => {
			socket.emit('join-call', window.location.href, username)
			socketId = socket.id

			socket.on('chat-message', addMessage)

			socket.on('user-left', (id) => {
				let video = document.querySelector(`[data-socket="${id}"]`)
				if (video !== null) {
					elms--
					video.parentNode.removeChild(video)

					let main = document.getElementById('main')
					let mq = window.matchMedia("(min-width: 480px)")
					if(!mq.matches){
						console.log("mobile")
						changeCssVideosForMobile(main)
					}else{
						console.log("desktop")
						changeCssVideos(main)
					}
				}
			})

			socket.on('user-joined', (id, clients, usernames) => {
				setUsernames(usernames)
				console.log("usernames : ",usernames)
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
								cssMesure = changeCssVideosForMobile(main)
							}else{
								console.log("desktop1")
								cssMesure = changeCssVideos(main)
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

	const silence = () => {
		let ctx = new AudioContext()
		let oscillator = ctx.createOscillator()
		let dst = oscillator.connect(ctx.createMediaStreamDestination())
		oscillator.start()
		ctx.resume()
		return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
	}
	const black = ({ width = 640, height = 480 } = {}) => {
		let canvas = Object.assign(document.createElement("canvas"), { width, height })
		canvas.getContext('2d').fillRect(0, 0, width, height)
		let stream = canvas.captureStream()
		return Object.assign(stream.getVideoTracks()[0], { enabled: false })
	}

	const handleVideo = () => {
		setVideo(!video)
		getUserMedia()
	}
	const handleAudio = () => {
		setAudio(!audio)
		getUserMedia()
	}
	const handleScreen = () => {
		setScreen(!screen)
		getDislayMedia()
	}
	const handleEndCall = () => {
		try {
			let tracks = localVideoref.current.srcObject.getTracks()
			tracks.forEach(track => track.stop())
		} catch (e) {}
		window.location.href = "/"
	}

	const openChat = () => {
		setChatModal(true)
		setNewmessages(0)
	} 

	const closeChat = () => {
		setChatModal(false)
	} 
	
	const handleMessage = (e) => {
		setMessage(e.target.value)
	}

	const openUser = () => {
		setUserModal(true)
	}
	
	const closeUser = () => {
		setUserModal(false)
	}

	const addMessage = (data, sender, socketIdSender) => {
		setMessages(prevState => ({
			...prevState,
			"sender": sender,
			"data": data
		}))
		if (socketIdSender !== socketId) {
			setNewmessages(newmessages + 1)
		}
	}

	const handleUsername = (e) => {
		console.log(username," username updated")
		setUsername(e.target.value)
	}

	const sendMessage = () => {
		socket.emit('chat-message', message, username)
		setMessage("")
		
		
		// this.setState({ message: "", sender: this.state.username })
	}

	const copyUrl = () => {
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

	const connect = () =>{
		console.log(username," username is here")
		if(username === null || username === undefined || username === ""){
			const mandatory = document.getElementById('mandatory')
			mandatory.style.display = "block"
			// alert("Username is Mandatory!")
		}
		else
		{
			setAskForUsername(false)
			getMedia()
		}
	} 

		return (
			<div>
				{askForUsername === true ?
					<Row className="screen">
						<Col>
						<div className="my-video">
						<video style={{borderRadius:"10px",backgroundColor:"#3C4043"}} width="100%" height="100%"  id="my-video" ref={localVideoref} autoPlay muted>
							</video>
							{/* <div style={{position:"absolute", display:"flex", marginLeft:"40%", bottom:"20px"}}>
										{
											audio ?
												<div className="screen_mic"  onClick={handleAudio} >
												<IoMdMic className="screen_mic_icon"/> 
												</div>
											:
												<div className="screen_mic_red"  onClick={handleAudio} >
												<IoMdMicOff className="screen_mic_icon"/>
												</div>
										}
										{
											video ?
												<div className="screen_video"  onClick={handleVideo}>
												<BiVideo className="screen_video_icon"/>
												</div>
											:
												<div className="screen_video_red"  onClick={handleVideo}>
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
								 value={username}
								 required placeholder="Username" onChange={e => handleUsername(e)} />
								<Button variant="contained" className="join_button" onClick={connect} style={{ 
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
										<h3 style={{ backgroundColor:"black",borderRadius:"10px"}} onClick={copyUrl}>{window.location.href}</h3>
									</div>
								</Col>
								<Col md={3}>
									<div className="icons_center">
										{
											audio ?
												<div className="mic"  onClick={handleAudio} >
												<IoMdMic className="mic_icon"/> 
												</div>
											:
												<div className="mic_red"  onClick={handleAudio} >
												<IoMdMicOff className="mic_icon"/>
												</div>
										}
										{
											video ?
												<div className="video"  onClick={handleVideo}>
												<BiVideo className="video_icon"/>
												</div>
											:
												<div className="video_red"  onClick={handleVideo}>
												<BiVideoOff className="video_icon"/>
												</div>
										}
										{
											screen ?
												<div className="screen_share_red"  onClick={handleScreen}>
												<MdStopScreenShare className="screen_share_icon" />
												</div>
											:
												<div className="screen_share"  onClick={handleScreen}>
												<MdScreenShare className="screen_share_icon" />
												</div>
										}
										<div className="end" onClick={handleEndCall}>
											<MdCallEnd className="end_icon" />
											</div>
									</div>
								</Col>
								<Col mc={3}>
								<div className="icons_right">
									<div className="recording_status">
										<MdFiberManualRecord className="recording_status_icon"/>
										<span className="rec">REC</span>
									</div>
									<div className="recording">
										<BiVideoRecording/>
									</div>
									<div className="people" onClick={openUser} >
										<MdPeople/><sup>{usernames.length}</sup>
									</div>
									<div className="chat" onClick={openChat}>
										<MdChat/>
									</div>
								</div>
								</Col>
							</Row>
						</div>
						{/* //modal for chat */}
						<Modal show={chatModal} onHide={closeChat} style={{ zIndex: "999999" }}>
							<Modal.Header closeButton>
								<Modal.Title>Chat Room</Modal.Title>
							</Modal.Header>
							<Modal.Body style={{ overflow: "auto", overflowY: "auto", height: "400px", textAlign: "left" }} >
								{messages.length > 0 ? messages.map((item, index) => (
									<div key={index} style={{textAlign: "left"}}>
										<p style={{ wordBreak: "break-all" }}><b>{item.sender}</b>: {item.data}</p>
									</div>
								)) : <p>No message yet</p>}
							</Modal.Body>
							<Modal.Footer className="div-send-msg">
								<Input placeholder="Message" value={message} onChange={e => handleMessage(e)} />
								<Button variant="contained" color="primary" onClick={sendMessage}>Send</Button>
							</Modal.Footer>
						</Modal>
						{/* //modal for list of participants */}
						<Modal show={userModal} onHide={closeUser} style={{ zIndex: "999999" }}>
							<Modal.Header closeButton>
								<Modal.Title>People List</Modal.Title>
							</Modal.Header>
							<Modal.Body style={{ overflow: "auto", overflowY: "auto", height: "400px", textAlign: "left" }} >
								{usernames.length > 0 ? usernames.map((item, index) => (
									<div key={index} style={{textAlign: "left"}}>
										<p style={{ wordBreak: "break-all" }}>{index+1} : <b>{item}</b></p><hr></hr>
									</div>
								)) : <p></p>}
							</Modal.Body>
						</Modal>


						<div className="container">
							<Row id="main" className="flex-container" style={{ margin: "", padding: "20px" }}>
								<video id="my-video" ref={localVideoref} autoPlay muted style={{ borderRadius:"10px", backgroundColor:"#3C4043",
									margin: "10px",objectFit: "fill",
									width: "100%",height: "100%"}}></video>
							</Row>
						</div>
					</div>
				}
			</div>
		)
}

export default Video