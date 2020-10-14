import * as path from 'path';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import { PROJEN_MARKER } from './common';
import * as logging from './logging';

export function cleanup(dir: string) {
  try {
    for (const f of findGeneratedFiles(dir)) {
      fs.removeSync(f);
    }
  } catch (e) {
    logging.warn(`warning: failed to clean up generated files: ${e.stack}`);
  }
}

function findGeneratedFiles(dir: string) {
  const ignore = [...readNpmIgnore(dir), ...readGitIgnore(dir), 'node_modules/**'];

  console.log(`ignored files: ${ignore}`);

  const files = glob.sync('**', {
    ignore: ignore,
    cwd: dir,
    dot: true,
    nodir: true,
    absolute: true,
  });

  const generated = new Array<string>();

  for (const file of files) {

    const contents = fs.readFileSync(file, 'utf-8');

    if (contents.includes(PROJEN_MARKER)) {
      generated.push(file);
    }
  }

  return generated;
}

function readGitIgnore(dir: string) {
  const filepath = path.join(dir, '.gitignore');
  if (!fs.pathExistsSync(filepath)) {
    return [];
  }

  return fs.readFileSync(filepath, 'utf-8')
    .split('\n')
    .filter(x => !x.startsWith('#') && !x.startsWith('!'))
    .map(x => `${x}\n${x}/**`)
    .join('\n')
    .split('\n');
}

function readNpmIgnore(dir: string) {
  const filepath = path.join(dir, '.npmignore');
  if (!fs.pathExistsSync(filepath)) {
    return [];
  }

  return fs.readFileSync(filepath, 'utf-8')
    .split('\n')
    .filter(x => !x.startsWith('#') && !x.startsWith('!'))
    .map(x => {
      // handle starting slash.  XXX should only do this on root dir per spec
      // @see https://github.com/npm/npm/issues/1912
      // XXX same problem exists for readGitIgnore above
      if (x.substr(0, 1) == '/') {
        const remainingPath = x.substr(1);
        return `${remainingPath}\n${remainingPath}/**`;
      } else {
        return `${x}\n${x}/**`;
      }
    })
    .join('\n')
    .split('\n');
}
