const calculateWorkingHours = (punchIn, punchOut) => {
    const diffMs = new Date(punchOut) - new Date(punchIn);

    const totalHours = diffMs / (1000 * 60 * 60);

    return Number(totalHours.toFixed(2));
};

module.exports = {
    calculateWorkingHours,
};