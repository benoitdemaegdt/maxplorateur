export function authenticate(name, password) {
  let isValid = true;

  isValid = name === process.env.NAME;
  isValid = password === process.env.PASSWORD && isValid;

  return isValid;
}