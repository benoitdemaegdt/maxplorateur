import auth from 'basic-auth';

import { authenticate } from '../_utils/authentication';
import { validate } from '../_utils/validation';
import { isTgvmaxAvailable } from '../_utils/sncf';

module.exports = async(req, res) => {
  /**
   * step 1 : authentication
   */
  const credentials = auth(req);
  if (!credentials || !authenticate(credentials.name, credentials.pass)) {
    res.statusCode = 401;
    res.end('Access denied');
    return;
  }
  /**
   * step 2 : validation
   */
  const { origin, destination, fromTime, toTime, tgvmaxNumber } = req.body;
  if (!validate(origin, destination, fromTime, toTime, tgvmaxNumber)) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }
  /**
   * step 3 : process incoming search request
   */
  console.log(`processing search from ${origin} to ${destination} at ${fromTime}`);
  const availability = await isTgvmaxAvailable(origin, destination, fromTime, toTime, tgvmaxNumber);
  res.status(200).json(availability);
};