const getNetworkIP = (networkInterfaces) => {
    let networkIP = "localhost";

    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                networkIP = net.address;
            }
        }
    }

    return networkIP;
};

module.exports = {
    getNetworkIP
};
