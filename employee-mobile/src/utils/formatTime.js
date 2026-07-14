// Converts decimal hours (e.g. 0.44) stored in the DB into hh:mm:ss for display
export const formatHoursToHMS = (decimalHours) => {
  const totalSeconds = Math.max(0, Math.round((decimalHours || 0) * 3600));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
};
