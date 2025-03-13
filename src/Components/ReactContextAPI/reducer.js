export const initialState = {
    user : null,
    status: null
}

export const actionTypes = {
    SET_USER: "SET_USER",
    SET_STATUS: "SET_STATUS"
}

const reducer = (state, action ) => {
    switch(action.type){
        case actionTypes.SET_USER:
            return {
                ...state,
                user: action.user
            }
        case actionTypes.SET_STATUS:
            return {
                ...state,
                status: action.status
            }
        default:
            return state
    }
}

export default reducer