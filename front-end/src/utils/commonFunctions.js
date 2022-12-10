import { ACCOUNT_NAME_REGEX } from "./constants";

export const isValidAccountName = (name)=> {
    const regEx = new RegExp(ACCOUNT_NAME_REGEX)
    return regEx.test(name);
}