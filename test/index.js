const Client = require("../");
const path = require("path");

const client = new Client("http://localhost:5000", {
    verbose: true,
});

client.add(path.join(__dirname, "demo_project"));
