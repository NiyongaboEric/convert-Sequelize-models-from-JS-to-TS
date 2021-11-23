# convert-Sequelize-models-from-JS-to-TS
A Regex script to move and convert all models written in JavaScript into Typescript

## Step1 Find Path
- Write a path to a database models. Ex: `saveApiModelsPath`
- Write a path to save generated models

## Step 2 
- Modify your template class to match your need. we used ours as `generateMainFileTemplate`

## Run Script
- Add in your `package.json` the script command name. Ex ours is invoked as `yarn sync:model:save-api:save-database` or `npm run sync:model:save-api:save-database`
```
"sync:model:save-api:save-database": "cross-env babel-node src/scripts/update/update-save-database-model.js",
```