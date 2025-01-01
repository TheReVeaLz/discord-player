/* eslint-disable */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const otherFlags = process.argv.slice(2);
const FILE_NAME = 'package.json';
const ENTRYPOINT = join(process.cwd(), 'packages');

console.log({ DP_IS_DEV: process.env.DP_PUBLISH_DEV })

const isDev = process.env.DP_PUBLISH_DEV === 'true';

if (!isDev) {
  console.log(`Disabled for testing.`)
  process.exit(1);
}

const packages = await readdir(ENTRYPOINT);

for (const dir of packages) {
  const path = join(ENTRYPOINT, dir, FILE_NAME);

  let packageJson = JSON.parse(await readFile(path, 'utf8'));

  if (isDev) {
    packageJson = {
      ...packageJson,
      version: `${packageJson.version}-dev.${Date.now()}`,
    };

    await writeFile(path, JSON.stringify(packageJson, null, 2));
  }

  const name = packageJson.name;

  console.log(`\nPublishing ${name}@${packageJson.version}`);

  const flags = ['--access public', isDev ? '--tag dev' : '', ...otherFlags].filter(Boolean);

  const cmd = `yarn workspace ${name} npm publish ${flags.join(' ')}`;

  console.log(`\nRunning: ${cmd} \n`);

  execSync(cmd, {
    stdio: 'inherit',
  });
}
