const calculateWorkingHours = (punchIn, punchOut) => {
    const diffMs = new Date(punchOut) - new Date(punchIn);

    const hours = diffMs / (1000 * 60 * 60);

    return hours;
};

module.exports = {
    calculateWorkingHours
};