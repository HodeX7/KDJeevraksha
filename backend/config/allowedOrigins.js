require("dotenv").config();

const allowedOrigins = [
    "http://localhost:8081",
    "http://j-app.in", "http://www.j-app.in", 
    "https://j-app.in", "https://www.j-app.in", 
    "http://api.j-app.in", "https://api.j-app.in", 
    process.env.REMOTE_CLIENT_APP];

module.exports = allowedOrigins;

/*

npm ERR! code 254npm ERR! path /home/cyilqndy/nodevenv/api.jrbmc.online/16/lib/node_modules/bcryptnpm ERR! command failednpm ERR! command sh -c -- node-pre-gyp install --fallback-to-buildnpm ERR! /home/cyilqndy/nodevenv/api.jrbmc.online/16/bin/node: fork: retry: Resource temporarily unavailablenpm ERR! /home/cyilqndy/nodevenv/api.jrbmc.online/16/bin/node: fork: retry: Resource temporarily unavailablenpm ERR! /home/cyilqndy/nodevenv/api.jrbmc.online/16/bin/node: fork: retry: Resource temporarily unavailablenpm ERR! /home/cyilqndy/nodevenv/api.jrbmc.online/16/bin/node: fork: retry: Resource temporarily unavailablenpm ERR! /home/cyilqndy/nodevenv/api.jrbmc.online/16/bin/node: fork: Resource temporarily unavailablenpm ERR! A complete log of this run can be found in:npm ERR!     /home/cyilqndy/.npm/_logs/2023-11-21T17_30_23_842Z-debug-0.log 

*/