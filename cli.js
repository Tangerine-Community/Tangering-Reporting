#!/usr/bin/env node

/**
 * CLI App Entry Point.
 */

/**
 * Module dependencies.
 */

const tangerine = require('commander');
const chalk = require('chalk');

/**
 * Local Dependencies.
 */

const createColumnHeaders = require('./controllers/assessment').createColumnHeaders;
const processAssessmentResult = require('./controllers/result').generateResult;
const createWorkflowHeaders = require('./controllers/workflow').createWorkflowHeaders;
const processWorkflowResult = require('./controllers/trip').processWorkflowResult;
const generateCSV = require('./controllers/generate_csv').generateCSV;

const dbQuery = require('./utils/dbQuery');
const dbConfig = require('./config');


/******************************************
 *  HELPER FUNCTIONS FOR GENERATING AND   *
 *      SAVING HEADERS AND RESULTS        *
 ******************************************
*/


/**
 * This function creates and saves assessment headers.
 *
 * @param {Array} data - database documents to be processed.
 *
 * @returns {Object} - couchDB save response
 */

async function generateAssessmentHeaders(data) {
  let response;
  for (item of data) {
    let assessmentId = item.doc.assessmentId;
    let generatedHeaders = await createColumnHeaders(assessmentId, 0, dbConfig.base_db);
    response = await dbQuery.saveHeaders(generatedHeaders, assessmentId, dbConfig.result_db);
  }
  return response;
}

/**
 * This function creates and saves workflow headers.
 *
 * @param {Array} data - database documents to be processed.
 *
 * @returns {Object} - couchDB save response
 */

async function generateworkflowHeaders(data) {
  let response;
  for (item of data) {
    let assessmentId = item.doc.assessmentId;
    let generatedHeaders = await createColumnHeaders(assessmentId, 0, dbConfig.base_db);
    response = await dbQuery.saveHeaders(generatedHeaders, assessmentId, dbConfig.result_db);
  }
  return response;
}

/**
 * This function creates and saves assessment results.
 *
 * @param {Array} data - database documents to be processed.
 *
 * @returns {Object} - couchDB save response
 */

async function generateAssessmentResult(data) {
  let response;
  for (item of data) {
    let docId = item.assessmentId || item.curriculumId;
    let ref = item._id;
    let processedResult = await processAssessmentResult(docId, 0, dbConfig.base_db);
    response = await dbQuery.saveResult(processedResult, ref, dbConfig.result_db);
  }
  return response;
}

/**
 * This function creates and saves workflow results.
 *
 * @param {Array} data - database documents to be processed.
 *
 * @returns {Object} - couchDB save response
 */

async function generateWorkflowResult(data) {
  let response;
  for (item of data) {
    let workflowId = item.workflowId;
    if (!workflowId) {
      let docId = item.assessmentId || item.curriculumId;
      let assessmentResults = await processAssessmentResult(docId, 0, dbConfig.base_db);
      response = await dbQuery.saveDoc(assessmentResults, item._id, dbConfig.result_db);
    } else {
      let processedResult = await processWorkflowResult(workflowId, dbUrl);
      response = await dbQuery.saveResult(processedResult, item.tripId, dbConfig.result_db);
    }
  }
  return response;
}

/**********************
 *  CLI APPLICATION   *
 **********************
*/

/**
 * This part is executed when the command `tangerine-reporting assessments` is run.
 */
tangerine
  .version('0.1.0')
  .command('assessments [dbUrl]')
  .description('Retrieves all assessments in the database')
  .action(async(dbUrl) => {
    const db = dbConfig.base_db || dbUrl;
    console.log(await dbQuery.getAllAssessment(db));
  });

/**
 * This part is executed when the command `tangerine-reporting workflows` is run.
 */
tangerine
  .version('0.1.0')
  .command('workflows [dbUrl]')
  .description('Retrieves all workflows in the database')
  .action(async(dbUrl) => {
    const db = dbConfig.base_db || dbUrl;
    console.log(await dbQuery.getAllWorkflow(db));
  });

/**
 * This part is executed when the command `tangerine-reporting results` is run.
 */
tangerine
  .version('0.1.0')
  .command('results [dbUrl]')
  .description('Retrieves all results in the database')
  .action(async(dbUrl) => {
    const db = dbConfig.base_db || dbUrl;
    console.log(await dbQuery.getAllResult(db));
  });

/**
 * This part is executed when the command `tangerine-reporting assessment-header <assessment_id>` is run.
 *
 * @param {string} id - assessment id is required.
 */
tangerine
  .version('0.1.0')
  .command('assessment-header <id>')
  .description('generate header for an assessment')
  .action((id) => {
    createColumnHeaders(id, 0, dbConfig.base_db)
      .then(async(data) => {
        console.log(await dbQuery.saveDoc(data, id, dbConfig.result_db));
      })
      .catch((err) => Error(err));
  });

/**
 * This part is executed when the command `tangerine-reporting assessment-result <assessment_id>` is run.
 *
 * @param {string} id - assessment id is required.
 */
tangerine
  .version('0.1.0')
  .command('assessment-result <id>')
  .description('process result for an assessment')
  .action((id) => {
    processAssessmentResult(id, 0, dbConfig.base_db)
      .then(async(result) => {
        console.log(await dbQuery.saveDoc(result, id, dbConfig.result_db));
      })
      .catch((err) => Error(err));
  });

/**
 * This part is executed when the command `tangerine-reporting workflow-header <workflow_id>` is run.
 *
 * @param {string} id - workflow id is required.
 */
tangerine
  .version('0.1.0')
  .command('workflow-header <id>')
  .description('generate headers for a workflow')
  .action((id) => {
    createWorkflowHeaders(id, dbConfig.base_db)
      .then(async(data) => {
        console.log(await dbQuery.saveDoc(data, id, dbConfig.result_db));
      })
      .catch((err) => Error(err));
  });

/**
 * This part is executed when the command `tangerine-reporting workflow-result <workflow_id>` is run.
 *
 * @param {string} id - workflow id is required.
 */
tangerine
  .version('0.1.0')
  .command('workflow-result <id>')
  .description('process result for a workflow')
  .action(function(id) {
    let tripId;

    dbQuery.retrieveDoc(id, dbConfig.base_db)
      .then((data) => {
        tripId = data.tripId;
        return processWorkflowResult(data.workflowId, dbConfig.base_db);
      })
      .then(async(result) => {
        console.log(await dbQuery.saveDoc(result, tripId, dbConfig.result_db));
      })
      .catch((err) => Error(err));
  });

/**
 * This part is executed when the command `tangerine-reporting create-all [flags]` is run.
 *
 * The various flags are required for this to execute.
 *
 */
tangerine
  .version('0.1.0')
  .command('create-all')
  .description('create headers or results based on the collection type')
  .option('-a', '--assessment', 'create all assessment headers')
  .option('-r', '--result', 'create all assessment results')
  .option('-w', '--workflow', 'create all workflow headers')
  .option('-t', '--workflow-result', 'generate all workflow results')
  .action((options) => {
    if (!options.A && !options.R && !options.W && !options.T) {
      console.log(chalk.red('Please select a flag either "-a", "-r", "-t", or "-w" flag along with your command. \n'));
    }
    if (options.A) {
      dbQuery.getAllAssessment(dbConfig.base_db)
      .then(async(data) => {
        await generateAssessmentHeaders(data);
        console.log(chalk.green('✓ Successfully generated all assessment headers'));
      }).catch((err) => Error(err));
    }
    if (options.W) {
      dbQuery.getAllWorkflow(dbConfig.base_db)
      .then(async(data) => {
        await generateworkflowHeaders(data);
        console.log(chalk.green('✓ Successfully generated all workflow headers'));
      }).catch((err) => Error(err));
    }
    if (options.R)  {
      dbQuery.getAllResult(dbConfig.base_db)
      .then(async(data) => {
        await generateAssessmentResult(data);
        console.log(chalk.green('✓ Successfully processed all assessment results'));
      }).catch((err) => Error(err));
    }
    if (options.T) {
      dbQuery.getAllWorkflow(dbConfig.base_db)
      .then(async(data) => {
        await generateWorkflowResult(data);
        console.log(chalk.green('✓ Successfully generated all workflow results'));
      }).catch((err) => Error(err));
    }
  }).on('--help', function() {
    console.log(chalk.blue('\n Examples: \n'));
    console.log(chalk.blue('  $ tangerine-reporting create-all -a'));
    console.log(chalk.blue('  $ tangerine-reporting create-all -r'));
    console.log(chalk.blue('  $ tangerine-reporting create-all -t'));
    console.log(chalk.blue('  $ tangerine-reporting create-all -w \n'));
  });

/**
 * This part is executed when the command `tangerine-reporting generate-csv <header_id> <result_id` is run.
 *
 * @param {string} headerId - generate header id from the result database is required.
 * @param {string} resultId - processed result id from the result database is required.
 */
tangerine
  .version('0.1.0')
  .command('generate-csv <headerId> <resultId>')
  .description('creates a csv file')
  .action((headerId, resultId) => {
    dbQuery.retrieveDoc(headerId, dbConfig.result_db)
      .then(async(docHeaders) => {
        const result = await dbQuery.retrieveDoc(resultId, dbConfig.result_db);
        await generateCSV(docHeaders, result);
        console.log(chalk.green('✓ CSV Successfully Generated'));
      })
      .catch((err) => Error(err));
  });


tangerine.parse(process.argv);

if (process.argv.length === 0) {
  tangerine.help();
}

console.log(chalk.green('✓ Tangerine Reporting CLI Tool'));