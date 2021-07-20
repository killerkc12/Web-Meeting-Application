import React from 'react'
import { useState } from 'react'
import { Button, Col, Container, Form, InputGroup, Row } from 'react-bootstrap'
import { useHistory } from 'react-router-dom'
import './Home.css'

const img = "https://thumbs.dreamstime.com/b/view-over-businessman-shoulder-laptop-where-four-multiracial-colleagues-engaged-group-meeting-line-video-conference-call-178126113.jpg"

const Home = () => {

    const [code, setCode] = useState("")
    const history = useHistory()


     const NewMeet = () => {
         console.log("clicked")
        let code = Math.random().toString(36).substring(2,10)
        history.push(`/${code}`)
    }

    const JoinMeet = () => {
        history.push(`/${code}`)
    }
    
    // document.addEventListener('click', NewMeet)

    return (
        <div className="home">
            <div className="home_left">
                <h1>चला भेटू या...</h1>
                <div className="home_left_bottom">
                    <button onClick={NewMeet} className="new_meeting">New Meeting</button>
                    <input onChange={e=> setCode(e.target.value)} className="meeting_code" type="text" placeholder="Enter the meeting code..." />
                    <button onClick={JoinMeet} className="join_meeting">Join</button>
                </div>
                
            </div>
            <div className="home_right">
            <img src={img}/>
            </div>
        </div>
    )
}

export default Home
