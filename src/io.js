const io = require("socket.io-client");

module.exports = (client, serverURL) => {
    const socket = io.connect(serverURL, { reconnect: true });
    client.log("Connecting to CI server with URL " + serverURL);

    socket.on("error", (e) => {
        client.log("Error connecting to CI server: " + e);
    });

    socket.on("connect", () => {
        client.connected = true;
        client.log("Connected to CI server, sending authentication request.");

        for (const [projectID, projectData] of client.projects.entries()) {
            let { deployKey } = projectData;
            socket.emit("auth", projectID, deployKey);
        }
    });

    socket.on("disconnect", () => {
        client.connected = false;
        client.log("Disconnected from CI server.");
    });

    socket.on("authSuccess", (projectID) => {
        client.log(
            "Auth success for Project " +
                projectID +
                " under directory " +
                client.projects.get(projectID).directory
        );
        client.emit("authSuccess", projectID);
    });

    socket.on("authFailed", (projectID, reason) => {
        client.log(
            "Auth denied for project " + projectID + ", reason: " + reason
        );
        client.emit("authFailed", projectID, reason);
    });

    socket.on("deploy", (ctx) => {
        const { branch, projectID } = ctx;
        client.log(
            "Deploy request received to project " +
                projectID +
                " in branch " +
                branch
        );

        const project = client.projects.get(projectID);
        const actions = [
            {
                type: "bash",
                arg: "cd " + project.directory,
            },
            ...project.parser.getBranchActions(branch),
        ];

        client.interpreter
            .runActions(actions, (err, stdout, stderr) => {
                client.log(err || stdout || stderr);
            })
            .catch((e) => {
                client.log("Failed running command: " + e);
            })
            .then(() => {
                client.log("Finished.");
            });
    });

    return socket;
};
