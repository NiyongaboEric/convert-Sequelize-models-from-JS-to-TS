const fs = require ('fs');
const path = require ('path');

const saveApiModelsPath = 'src/database/models';
const saveDatabaseModelsPath = 'src/database/models_ts';

const matchDataTypes = {
	BOOLEAN: 'boolean',
	BIGINT: 'number',
	INTEGER: 'number',
	DECIMAL: 'number',
	DOUBLE: 'number',
	FLOAT: 'number',
	SMALLINT: 'number',
	DATEONLY: 'Date',
	DATE: 'Date',
	STRING: 'string',
	TEXT: 'string',
	JSONB: 'string',
	ARRAY: [],
	ENUM: '',
};

const dataTypesList = [
	'DataTypes.BOOLEAN', 'DataTypes.BIGINT', 'DataTypes.INTEGER',
	'DataTypes.DECIMAL', 'DataTypes.STRING', 'DataTypes.DATEONLY',
	'DataTypes.DATE', 'DataTypes.DOUBLE', 'DataTypes.TEXT',
	'DataTypes.FLOAT', 'DataTypes.SMALLINT', 'DataTypes.JSONB',
];

const filesIgnore = ['index.js'];

const removeQuotesHandler =(matched) => {
	return matched.replace(/"/g, '');
}

const removeQuotes = (text) => text
	.replace(/"(DataTypes)\.(BOOLEAN|BIGINT|INTEGER|DECIMAL|STRING|DATEONLY|DATE|DOUBLE|TEXT|FLOAT|SMALLINT|JSONB)"/g,removeQuotesHandler)
	.replace(/"(DataTypes)\.ARRAY\(DataTypes\.STRING\)"/g, removeQuotesHandler)
	.replace(/"(DataTypes)\.ARRAY\(DataTypes\.BIGINT\)"/g,removeQuotesHandler)
	.replace(/"(DataTypes)\.ENUM\('blocked','unblocked'\)"/g,removeQuotesHandler)
	.replace(/"(DataTypes)\.ENUM\('deactivated','activated'\)"/g, removeQuotesHandler)
 
const generateMainFileTemplate = (
	modelAssociationImportText,
	className,
	generatedTypesPlainText,
	relationshipKeyText,
	associationObjectText,
	modelAttributes,
	tableInfo,
	modelAssociationList,
	) => {

	const output = `
import { Model, DataTypes, Association } from 'sequelize';
import { sequelize } from './connection';

${modelAssociationImportText}

/**
* ${className} Class Model
*/
class ${className} extends Model {
${generatedTypesPlainText}

	public readonly created_at!: Date;
	public readonly updated_at!: Date;

${relationshipKeyText}

  ${associationObjectText}

}

${className}.init(
	${removeQuotes(modelAttributes)},
	${tableInfo}
);

${modelAssociationList}

export default ${className};

`;
	return output;
};

const saveTemplateAsFile = (dirPath, filename, fileContent) => {
	/**
	 * If directory path not exist create it 
	 * src/database/models_ts
	 * 
	*/

	if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath);
  }
	fs.writeFile(`${dirPath}/${filename}`, fileContent, (err) => {
		if (err) throw error
	});
};

/**
 * Read Save API V3 models
 * 
*/

fs.readdirSync(saveApiModelsPath).map(fileNameModels => {
	/**
	 * Read a content inside each file name module
	 * Ignore config files
	*/
	if (!filesIgnore.includes(fileNameModels)) {
		const pathToEachFileModel = path.join(saveApiModelsPath, fileNameModels)
		fs.readFile(
			pathToEachFileModel, {
				encoding:'utf8',
				flag:'r'
			},
			((err, data) => {
				if (err) throw err;
				/**
				 * Update Save Database model
				 * Create a file or update current file or overwite existing file
				 * 
				*/

				let modelAssociationList;
				let associationModelAsList;
				let className;
				let tableInfo;
				let modelAttributes;
				let generatedTypesPlainText = '';
				let relationshipKeyText = '';
				let associationObjectText = '';
				let modelAssociationImportText='';
				
				const findClassName = data.replace(/\s\s+/g, '').match(/(?<=sequelize\.define\().+?(?=\,)/g);
				if (findClassName) {
					className = findClassName[0].replace(/['"]+/g, '');
				}
	
				/**
				 * Grab Save api attributes
				 * Parse it with JSON.parse
				 * Convert result with JSON.stringfy
				 * Generates types
				 * 
				 */
				const findAttributeData = data
					.replace(/\/\/.*/g, '')
					.replace(/\"/g, "'")
					.replace(/\s+/g, '').match(/(?<=sequelize.define\('\S+',).*(?=,{tableName)/g)
				const findAttributesText = findAttributeData ?  findAttributeData[0] : '';
				if (findAttributesText) {
					const attributesTextFormatedKeys = findAttributesText.replace(/(?<=[{,])[a-zA-Z_]*(?=\:)/g, (matched) => {
						return `"${matched}"`
					});
					const attributesTextFormatedType = attributesTextFormatedKeys.replace(/(DataTypes)\.(BOOLEAN|BIGINT|INTEGER|DECIMAL|STRING|DATEONLY|DATE|DOUBLE|TEXT|FLOAT|SMALLINT|JSONB)/g, (matched) => {
						return `"${matched}"`
					})
						.replace(/(?<="get").*(?=;})/g, '')
						.replace(/"get";}/g, '')
						.replace(/DataTypes\.ARRAY\("DataTypes\.STRING"\)/g, '"DataTypes.ARRAY(DataTypes.STRING)"')
						.replace(/DataTypes\.ARRAY\("DataTypes\.BIGINT"\)/g, '"DataTypes.ARRAY(DataTypes.BIGINT)"')
						.replace(/,}/g, '}')
						.replace(/'/g, '"')
						.replace(/DataTypes\.ENUM\("blocked","unblocked"\)/g, '"DataTypes.ENUM(\'blocked\',\'unblocked\')"')
						.replace(/moment\("\d{4}-\d{2}-\d{2}"\)\.format\(\)/g, null)
						.replace(/moment\(\).format\(\)/g, null)
						.replace(/uuid\.v4\(\)/g, null)
						.replace(/DataTypes\.ENUM\("deactivated","activated"\)/g, '"DataTypes.ENUM(\'deactivated\',\'activated\')"')
					const attributesObject = JSON.parse(attributesTextFormatedType.replace(',}', '}'));
					modelAttributes = JSON.stringify(attributesObject, undefined, 2);

					Object
						.entries(attributesObject)
						.forEach((item) => {
							let foundType;
							let actualType;
							let listType
							/**
							 * id
							 */
							if (item[0] === 'id') {
								generatedTypesPlainText += `\tpublic id!: number;\n`;
							}
							/**
							 * DataTypes.*(type)
							 */
							if (dataTypesList.includes(item[1])) {
								foundType = item[1].split('.')[1];
								actualType = matchDataTypes[foundType]
								generatedTypesPlainText += `\t${item[0]}!: ${actualType};\n`;
							}
							/**
							 * Object 
							 * { type: DataTypes.*(type) }
							 */
							if (typeof item[1] === 'object' && item[0] !== 'id') {
								foundType = item[1].type.split('.')[1];
								actualType = matchDataTypes[foundType];
								if (actualType) {
									generatedTypesPlainText += `\t${item[0]}!: ${actualType};\n`
								}
							}
							/**
							 * DataTypes ARRAYS || ENUM
							 * DataTypes.ARRAY(DataTypes.(type))
							 */
							const dataTypeSub = /(DataTypes\.ARRAY)|(DataTypes\.ENUM)/
							const findTypeArray = new RegExp(dataTypeSub);
							if(typeof item[1] === "string" && findTypeArray.test(item[1])) {
								listType = item[1].match(/(.*?)(?=\()/)[0];
								if (listType === 'DataTypes.ARRAY') {
									foundType = item[1].match(/(?<=\()(.*?)(?=\))/g)[0].split('.')[1];
									actualType = matchDataTypes[foundType];
									generatedTypesPlainText += `\t${item[0]}!: ${actualType}[];\n`;
								}
								if (listType === 'DataTypes.ENUM') {
									foundType = item[1].match(/(?<=\()(.*?)(?=\))/g)[0].replace(/\,/g, '|');
									generatedTypesPlainText += `\t${item[0]}!: ${foundType};\n`;
								}
							}
							/**
							 * DataTypes ARRAYS || ENUM || ANY
							 * { type: DataTypes.*(type) }
							 */
							if (typeof item[1] === 'object' ) {
								listType = item[1].type.match(/(.*?)(?=\()/);
								const isType = listType ? listType[0] : '';
								if (isType === 'DataTypes.ARRAY') {
									foundType = item[1].type.match(/(?<=\()(.*?)(?=\))/g)[0].split('.')[1];
									actualType = matchDataTypes[foundType];
									generatedTypesPlainText += `\t${item[0]}!: ${actualType}[];\n`;
								}
								if (isType === 'DataTypes.ENUM') {
									foundType = item[1].type.match(/(?<=\()(.*?)(?=\))/g)[0].replace(/\,/g, '|');
									generatedTypesPlainText += `\t${item[0]}!: ${foundType};\n`;
								}
							}
						})
				}
	
				/**
				 * Find associations used in save-api-v3
				 * Generate import
				 * 
				 */
				const findModelToImport = data.replace(/\s+/g, '').match(/(?<=models\.).*?(?=\,|\.)/g);
				if (findModelToImport) {
					const removeModuleDuplicate =	new Set(findModelToImport);
					for (let item of removeModuleDuplicate) {
						modelAssociationImportText += `import ${item} from './${item}';\n`;
					}
				}
	
				/**
				 * Copy information of table
				 * Paste it
				 * 
				 */
				const findtableName = data.match(/(?<=tableName\: ).+?(?=\,)/g);
				if (findtableName) {
					tableInfo = 
					`{
						"sequelize": sequelize,
						"tableName": '${findtableName[0].replace(/['"]+/g, '')}',
						"underscored": true,
						"timestamps": true,
						"createdAt": "created_at",
						"updatedAt": "updated_at",
					}`;
				}
	
				/**
				 * Find associations and relationship used in save-api-v3
				 * Removed "models."
				 * Paste it
				 */
				const findModelAssociation = data
					.replace(/\/\/.*/g, '')
					.match(/(.*?\(models\.)(.*)([\s\S]*)(\}\))/g);
				if (findModelAssociation) {
					const RemoveModelDot = findModelAssociation[0].replace(/(models\.)/g, '');
					modelAssociationList = RemoveModelDot;
				} else {
					modelAssociationList = '';
				}

				const findAssociationUsed = data
					.replace(/\s\s+/g, '')
					.match(/(?<=\(models\.)(.+?)(as\:).*?(\}\))/g)
				if (findAssociationUsed) {
					associationObjectText += 'public static associations: {\n';
					associationModelAsList = findAssociationUsed.map((item, index) => {
						const result = {};
						const findModel = item.replace(/\)/g, '').match(/.*?(?=\,)/g)[0];
						const findAsKey = item.replace(/\)/g, '').match(/(as:.*?(\w+))/)[2];
						const findForeignKey = item.replace(/\)/g, '').match(/(foreignKey:.*?(\w+))/)[2];
						const targetKey = item.replace(/\)/g, '').match(/(targetKey:.*?(\w+))/)
						const throughKey = item.replace(/\)/g, '').match(/(through:.*?(\w+))/)
						result['findModel'] = findModel;
						result['findAsKey'] = findAsKey;
						result['findForeignKey'] = findForeignKey;
						relationshipKeyText += `\tpublic readonly ${findAsKey}?: ${findModel};\n`;
						if (index !== 0) {
							associationObjectText+='\n'
						}
						associationObjectText += `\t\t${findAsKey}: Association<${findModel}, ${className}>;`;
						if (targetKey) {
							result['targetKey']=targetKey[2];
						}
						if (throughKey) {
							result['throughKey']=throughKey[2];
						}
						return result;
					});
					associationObjectText += '\n\t};';
				}
	
				const modelFilename = `${className}.ts`;
				const outputMainFile = generateMainFileTemplate(
					modelAssociationImportText, className,
					generatedTypesPlainText, relationshipKeyText,
					associationObjectText, modelAttributes, tableInfo,
					modelAssociationList,
				);
				saveTemplateAsFile(saveDatabaseModelsPath, modelFilename, outputMainFile);
			})
		);	
	}
});
