import firebase from 'firebase'
import 'firebase/firestore'
import 'firebase/auth'

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCBM_xezVeVhjqzKEDef8VL4pZKOXwaxbs",
    authDomain: "web-meeting-ff9e2.firebaseapp.com",
    projectId: "web-meeting-ff9e2",
    storageBucket: "web-meeting-ff9e2.appspot.com",
    messagingSenderId: "69349798838",
    appId: "1:69349798838:web:8fb8b06176627d11ebc717",
    measurementId: "G-3PQ09NEG2D"
  };

const firebaseApp = firebase.initializeApp(firebaseConfig)  
const db = firebaseApp.firestore()
const auth = firebase.auth()
const provider = new firebase.auth.GoogleAuthProvider()

export { auth, provider}
export default db;