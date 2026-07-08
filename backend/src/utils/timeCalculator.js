const calculateWorkingHours = (punchIn, punchOut) => {
    const diffMs = new Date(punchOut) - new Date(punchIn);

    const totalSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

module.exports = {
    calculateWorkingHours,
};