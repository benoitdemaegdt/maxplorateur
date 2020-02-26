export function validate(origin, destination, fromTime, toTime, tgvmaxNumber) {
  if (!origin || !destination || !fromTime || !toTime || !tgvmaxNumber) {
    return false;
  }
  return true;
}