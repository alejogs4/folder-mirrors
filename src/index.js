const path = require('path');
const watchman = require('fb-watchman');
const { log } = require('./utils');
const { synchronizeTwoFiles, removeMirrorFile, removeDirectory } = require('./fs-operations');

module.exports = function buildModulesSync(modules) {
  const watchmanClient = new watchman.Client();

  function observeModuleChanges({ observedModule = '', mirrorModule = '' }) {
    const baseDirectoryTree = path.dirname(observedModule);
    const observedDirectoryTree = path.basename(observedModule);

    watchmanClient.command(['watch-project', baseDirectoryTree], (watchError) => {
      if (watchError) {
        console.error(watchError);
        return;
      }

      const subscriptionName = `${observedModule} -> ${mirrorModule}`;
      const subscriptionInformation = {
        expression: ['allof', ['match', '*']],
        fields: ['name', 'size', 'exists', 'type'],
      };

      subscriptionInformation.relative_root = observedDirectoryTree;

      watchmanClient.command(
        ['subscribe', baseDirectoryTree, subscriptionName, subscriptionInformation],
        (subscribeError) => {
          if (subscribeError) {
            console.error(subscribeError);
            return;
          }

          log.info(`Subscription ${subscriptionName} established`);
        },
      );

      watchmanClient.on('subscription', async (response) => {
        if (response.subscription !== subscriptionName) return;

        const modifiedFiles = response.files
          .filter((file) => file.type === 'f')
          .map(({ name, exists }) => {
            return exists
              ? synchronizeTwoFiles(observedModule, mirrorModule, name)
              : removeMirrorFile(mirrorModule, name);
          });

        await Promise.all(modifiedFiles).catch(console.error);
        response.files
          .filter((directory) => directory.type === 'd' && !directory.exists)
          .map((directory) => path.join(mirrorModule, directory.name))
          .forEach(removeDirectory);
      });
    });
  }

  return {
    listen() {
      watchmanClient.capabilityCheck({ optional: [], required: ['relative_root'] }, (capabilityError) => {
        if (capabilityError) {
          console.error(capabilityError);
          watchmanClient.end();
          return;
        }

        modules.forEach(observeModuleChanges);
      });
    },
  };
};
