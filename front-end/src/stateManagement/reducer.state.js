export const initialState = {
    // user: {},
    // login: false,
    address:"",
};

const reducer = (state, action) => {

    switch (action.type) {
        case "LOGIN":
            return {
                ...state,
                login: true,
                user: action.payload,
            };

        case "METAMASK_ADDRESS":
            return {
                ...state,
                address: action.payload,
            };

        case "WAX_CLOUD_USER_KEYS":
            return {
                ...state,
                wax_cloud_address: action.payload.user,
                wax__clouc_publicKeys: action.payload.keys
            };


        default:
            return state;
    }
};

export default reducer;