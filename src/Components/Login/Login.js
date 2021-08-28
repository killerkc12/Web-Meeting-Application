import React, { useState } from 'react'
import { auth, provider } from '../Firebase/Firebase'
import { actionTypes } from '../ReactContextAPI/reducer'
import { useStateValue } from '../ReactContextAPI/StateProvider'
import SignInWithGoogle from './SignInWithGoogle'
import './Login.css'

const userImage = "https://www.vippng.com/png/full/355-3554387_create-digital-profile-icon-blue-profile-icon-png.png"

const Login = () => {

    const [state, dispatch] = useStateValue()
    const [user, setUser] = useState(null)

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

    return (
        <div  className="home_left_top">
                    <div className="user_right">
                        {
                            state?.user? 
                            <div>
                                <span>{state?.user?.email}</span><br></br>
                                <span className="switch_account" onClick={LoginInWithGoogle}>
                                    Switch Account
                                </span>
                            </div>
                            :
                            <div onClick={LoginInWithGoogle} style={{cursor:"pointer"}}>
                                <SignInWithGoogle/>
                            </div>
                        }
                    </div>
                    <div className="user_left">
                        {
                            state?.user ?
                                <img src={state?.user?.photoURL} width="50px" height="50px" alt="user logo" />
                            :
                                <img src={userImage} width="50px" height="50px" alt="user logo" />
                        }
                    </div>
                </div>
    )
}

export default Login
