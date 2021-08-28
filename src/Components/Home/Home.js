import React from 'react'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { auth, provider } from '../Firebase/Firebase'
import Login from '../Login/Login'
import SignInWithGoogle from '../Login/SignInWithGoogle'
import { actionTypes } from '../ReactContextAPI/reducer'
import { useStateValue } from '../ReactContextAPI/StateProvider'
import './Home.css'

const userImage = "https://www.vippng.com/png/full/355-3554387_create-digital-profile-icon-blue-profile-icon-png.png"
const img = "https://thumbs.dreamstime.com/b/view-over-businessman-shoulder-laptop-where-four-multiracial-colleagues-engaged-group-meeting-line-video-conference-call-178126113.jpg"

const Home = () => {

    const [code, setCode] = useState("")
    const [user, setUser] = useState(null)
    const [state, dispatch] = useStateValue()
    const history = useHistory()

    const GenerateRandom = (size) => {
        return Math.random().toString(36).substring(2,size)
    }


     const NewMeet = () => {
         console.log("clicked")
        let code = GenerateRandom(5) + "-" + GenerateRandom(6) + "-" + GenerateRandom(5)
        history.push({
            pathname:`/${code}`,
            user
        })
    }

    const JoinMeet = () => {
        history.push(`/${code}`)
    }
    
    const LoginInWithGoogle = () => {
        auth.signInWithPopup(provider)
        .then(result => {
            setUser(result.user)
            dispatch({
                type: actionTypes.SET_USER,
                user: result.user
            })
            // history.push(`/${code}`)
        })
        .catch(err=> {
            console.log(err)
        })
    }
    console.log("State == ",state)
    console.log("User === ",user)


    return (
        <div className="home">
            <div className="home_left">
                <Login/>
                <div className="home_left_bottom">
                    <h1>चला भेटू या...</h1>
                    <div className="home_left_bottom_bottom">
                        <button onClick={NewMeet} className="new_meeting">New Meeting</button>
                        <input onChange={e=> setCode(e.target.value)} className="meeting_code" type="text" placeholder="Enter the meeting code..." />
                        <button onClick={JoinMeet} className="join_meeting">Join</button>
                    </div>
                </div>
            </div>
            <div className="home_right">
            <img src={img} alt="right side"/>
            </div>
        </div>
    )
}

export default Home
