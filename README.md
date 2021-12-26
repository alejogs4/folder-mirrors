## Sync tool

This tool allows to improve both development experience and confidence in development time, to properly set it up you must create a file named sync-config.js in the project's root where you will point out to the directories you will observe changes and those ones where these changes will be reflected as soon as are made

```javascript
// sync-config.js
const path = require('path')

module.exports = [
  {
    observedModule: path.join(__dirname, '..', 'folder1', 'src'),
    mirrorModule: path.join(__dirname, 'folder2', 'src)
  },
]
```

In the above example we are observing two modules, chat and catalog so as changes are made the sync tool will carry these changes to the mirror modules which in the example are the chat and catalog present in main repo's node_modules, please put the paths you want to observe based on your own folder structure

To run the tool execute the following command

```bash
node sync.js
```
