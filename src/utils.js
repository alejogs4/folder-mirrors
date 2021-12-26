const chalk = require("chalk");

function info(content) {
  console.log(chalk.blue(content));
}

function created(content) {
  console.log(chalk.green(content));
}

function removed(content) {
  console.log(chalk.yellowBright(content));
}

function modified(content) {
  console.log(chalk.cyan(content));
}

module.exports = {
  log: {
    created,
    removed,
    modified,
    info,
  },
};
