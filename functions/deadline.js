function withDeadline(promise, milliseconds = 10000) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Firebase operation timed out')), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
module.exports = { withDeadline };
