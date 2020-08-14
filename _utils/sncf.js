import Axios from 'axios';
import { filter, get, isEmpty, isNil, map, uniq } from 'lodash';
import moment from 'moment-timezone';

export async function isTgvmaxAvailable(origin, destination, fromTime, toTime, tgvmaxNumber) {
  const tgvmaxHours = await getTgvmaxHours(origin, destination, fromTime, toTime, tgvmaxNumber);
  /**
   * If previous call returns an empty array, there is no TGVmax available
   */
  return isEmpty(tgvmaxHours)
    ? { isTgvmaxAvailable: false, hours: [] }
    : { isTgvmaxAvailable: true, hours: uniq(tgvmaxHours) }
}

async function getTgvmaxHours(origin, destination, fromTime, toTime, tgvmaxNumber) {
  const results = [];
  let keepSearching = true;
  let departureMinTime = moment(fromTime).tz('Europe/Paris').format('YYYY-MM-DD[T]HH:mm:ss');
  const departureMaxTime = moment(toTime).tz('Europe/Paris').format('YYYY-MM-DD[T]HH:mm:ss');

  try {
    while (keepSearching) {
      const config = {
        url: 'https://wshoraires.oui.sncf/m770/vmd/maq/v3/proposals/train',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'OUI.sncf/65.1.1 CFNetwork/1107.1 Darwin/19.0.0',
          'Accept-Language': 'fr-FR ',
          'Content-Type': 'application/json;charset=UTF8',
          Host: 'wshoraires.oui.sncf',
          'x-vsc-locale': 'fr_FR',
          'X-Device-Type': 'IOS',
        },
        data: {
          departureTown: {
            codes: {
              resarail: origin,
            },
          },
          destinationTown: {
            codes: {
              resarail: destination,
            },
          },
          features: [
            'TRAIN_AND_BUS',
            'DIRECT_TRAVEL',
          ],
          outwardDate: moment(departureMinTime).format('YYYY-MM-DD[T]HH:mm:ss.SSSZ'),
          passengers: [
            {
              age: 25, // random
              ageRank: 'YOUNG',
              birthday: '1995-03-06', // random
              commercialCard: {
                number: tgvmaxNumber,
                type: 'HAPPY_CARD',
              },
              type: 'HUMAN',
            },
          ],
          travelClass: 'SECOND',
        },
      };

      /**
       * interceptor for handling sncf 200 ok that should be 500 or 301
       */
      Axios.interceptors.response.use(async(res) => {
        if (!isNil(res.data.exceptionType)) {
          return Promise.reject({
            response: {
              status: 500,
              statusText: data.exceptionType,
            },
          });
        }
        return res;
      });

      /**
       * get data from oui.sncf
       */
      const response = await Axios.request(config);
      const pageJourneys = get(response, 'data.journeys', []);

      results.push(...pageJourneys);

      const pageLastTripDeparture = moment(pageJourneys[pageJourneys.length - 1].departureDate)
      .tz('Europe/Paris').format('YYYY-MM-DD[T]HH:mm:ss');

      if (
        moment(departureMaxTime).isSameOrBefore(pageLastTripDeparture)
        || moment(departureMinTime).isSame(pageLastTripDeparture)
      ) {
        keepSearching = false;
      }

      departureMinTime = pageLastTripDeparture;
    }
  } catch (error) {
    const status = get(error, 'response.status', '');
    const statusText = get(error, 'response.statusText', '');
    const label = get(error, 'response.data.label', '');
    console.log(`SNCF API ERROR : ${status} ${statusText} ${label}`);
  }

  /**
   * 1/ filter out trains with no TGVmax seat available
   * 2/ filter out trains leaving after toTime
   */
  const tgvmaxTravels = filter(results, (item) => {
    const departureDate = moment(item.departureDate).tz('Europe/Paris').format('YYYY-MM-DD[T]HH:mm:ss');

    return isNil(item.unsellableReason)
      && item.price.value === 0
      && moment(departureDate).isSameOrBefore(departureMaxTime);
  });

  return map(tgvmaxTravels, (tgvmaxTravel) => {
    return moment(tgvmaxTravel.departureDate).tz('Europe/Paris').format('HH:mm');
  });
}

