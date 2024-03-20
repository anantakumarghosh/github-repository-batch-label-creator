const { exec } = require('child_process');
const repoLabels = require("./sampleJson");
const util = require('util');
const execPromisified = util.promisify(exec);

let repositoryNotFound = [];
let validRepositoryList = [];

/**
 * Checks if a GitHub repository exists using the GitHub CLI.
 * @param {string} ownerRepo - The GitHub repository in the format owner/repo.
 */
async function checkIfRepoExists(ownerRepo) {
  try {
    await execPromisified(`gh repo view ${ownerRepo}`);
    console.log(`Repository ${ownerRepo} exists.`);
    validRepositoryList.push(ownerRepo);
  } catch (error) {
    console.error(`Repository ${ownerRepo} does not exist or an error occurred: ${error.message}`);
    repositoryNotFound.push(ownerRepo);
  }
}

/**
 * Iterates over a list of repositories from a JSON object and checks their existence.
 */
async function checkIfListedRepositoryExists() {
  const allPromises = [];
  Object.keys(repoLabels).forEach(orgName => {
    Object.keys(repoLabels[orgName]).forEach(repoName => {
      const repositoryFullName = `${orgName}/${repoName}`;
      allPromises.push(checkIfRepoExists(repositoryFullName));
    });
  });

  await Promise.all(allPromises);
  console.log('Validation complete.');
  console.log('Repositories not found:', repositoryNotFound);
  console.log('Valid repositories:', validRepositoryList);
}

/**
 * Creates GitHub labels for repositories based on the provided JSON configuration.
 */
async function createLabelsFromJson() {
  Object.keys(repoLabels).forEach(orgName => {
    Object.keys(repoLabels[orgName]).forEach(repoName => {
      const repositoryFullName = `${orgName}/${repoName}`;
      if (!repositoryNotFound.includes(repositoryFullName)) {
        const labels = repoLabels[orgName][repoName];
        Object.entries(labels).forEach(([labelName, labelDetails]) => {
          createLabels(repositoryFullName, labelName, labelDetails.color, labelDetails.description);
        });
      }
    });
  });
  console.log('Label creation complete.');
}

/**
 * Creates a label in a GitHub repository.
 * 
 * @param {string} repositoryName - Full name of the repository (including organization).
 * @param {string} labelName - Name of the label to create.
 * @param {string} labelColor - Color code for the label.
 * @param {string} labelDescription - Description of the label.
 */
async function createLabels(repositoryName, labelName, labelColor, labelDescription) {
  let colorOption = labelColor ? `--color "${labelColor}"` : '';
  let descriptionOption = labelDescription ? `--description "${labelDescription}"` : '';
  let labelOptions = `${colorOption} ${descriptionOption} --force`;
  let ghLabelCreateCommand = `gh label create "${labelName}" ${labelOptions} --repo ${repositoryName}`;

  try {
    await execPromisified(ghLabelCreateCommand);
    console.log(`Label "${labelName}" created in ${repositoryName}.`);
  } catch (error) {
    console.error(`Failed to create label "${labelName}" in ${repositoryName}: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  await checkIfListedRepositoryExists();
  if (repositoryNotFound.length === 0) {
    await createLabelsFromJson();
  } else {
    console.log('Not all repositories are valid. Label creation process aborted.');
  }
}

main().then(() => console.log('Process completed.')).catch(console.error);
