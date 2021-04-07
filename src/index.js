const EventEmitter = require("events");
const path = require("path");

const defaultConfig = require("./defaultConfig.json");
const Socket = require("./io");

const Parser = require("@strawci/parser");
const Interpreter = require("@strawci/interpreter");

class StrawClient extends EventEmitter {
    constructor(serverURL, settings) {
        super();
        this.connected = false;
        this.settings = { ...defaultConfig, ...settings };
        this.projects = new Map();
        this.interpreter = new Interpreter();
        this.socket = Socket(this, serverURL);
    }

    log(message) {
        if (this.settings.verbose) {
            console.log("[Verbose] " + message);
        }
    }

    init(parser) {
        this.log("Inition request for project ID " + parser.getProjectID());
        this.interpreter
            .runActions(parser.getInitialActions(), (err, stdout, stderr) => {
                console.log(err || stdout || stderr);
            })
            .catch((e) => {
                console.error("Failed running command: " + e);
            })
            .then(() => {
                console.log("Finished.");
            });
    }

    add(directory, firstInit = false) {
        this.log(
            "Adding directory " +
                directory +
                " as a project with firstInit=" +
                firstInit
        );
        const parser = new Parser(
            path.join(directory, this.settings["projectConfigFolder"])
        );
        const projectID = parser.getProjectID();
        const deployKey = parser.getDeployKey();

        this.projects.set(projectID, { directory, parser, deployKey });

        if (this.connected) {
            this.socket.emit("auth", projectID, deployKey);
        }

        if (firstInit) {
            this.init();
        }
    }
}

module.exports = StrawClient;
