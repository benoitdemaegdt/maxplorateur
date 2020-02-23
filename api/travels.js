module.exports = (req, res) => {
  const { origin, destination, fromTime, toTime, tgvmaxNumber } = req.body;
  res.send(
    `Your are looking for a travel from ${origin} to ${destination} between ${fromTime} and ${toTime} for id ${tgvmaxNumber}`
  );
};