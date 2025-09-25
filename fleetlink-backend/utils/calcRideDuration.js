// Use the simplified formula from the task. If result is 0, use 1 hour minimum.
module.exports = function calcRideDurationHours(fromPincode, toPincode){
  const a = parseInt(fromPincode, 10);
  const b = parseInt(toPincode, 10);
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Invalid pincode(s)');
  const hours = Math.abs(b - a) % 24;
  return hours === 0 ? 1 : hours; // avoid zero-length bookings
}
